package org.bloomclient.cosmetics;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URLEncoder;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

public final class BloomCapeService {
    private static final Logger LOGGER = LoggerFactory.getLogger("Bloom Cosmetics");
    private static final BloomCapeService INSTANCE = new BloomCapeService();
    private static final int MAX_STATIC_BYTES = 8 * 1024 * 1024;
    private static final int MAX_ATLAS_BYTES = 32 * 1024 * 1024;

    private final ConcurrentHashMap<UUID, Long> observedPlayers = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, CapeAssignment> assignments = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<LoadedCape>> capeLoads = new ConcurrentHashMap<>();
    private final AtomicBoolean started = new AtomicBoolean();
    private final AtomicBoolean refreshing = new AtomicBoolean();

    public static BloomCapeService get() {
        return INSTANCE;
    }

    public void start() {
        if (!started.compareAndSet(false, true)) return;
        BloomCosmeticsRuntime.scheduleRefresh(this::refreshObservedPlayers);
        LOGGER.info("Bloom Cosmetics is ready for live static and animated cape updates.");
    }

    public Identifier textureFor(UUID uuid) {
        MinecraftClient minecraft = MinecraftClient.getInstance();
        UUID identity = BloomCosmeticsRuntime.stableIdentity(minecraft, uuid);
        BloomCosmeticsRuntime.observe(observedPlayers, identity);
        CapeAssignment assignment = assignments.get(identity);
        return assignment == null || assignment.cape == null ? null : assignment.cape.textureNow();
    }

    private void refreshObservedPlayers() {
        if (!refreshing.compareAndSet(false, true)) return;
        try {
            List<UUID> players = BloomCosmeticsRuntime.activePlayers(observedPlayers);
            if (players.isEmpty()) {
                refreshing.set(false);
                return;
            }
            var request = BloomCosmeticsRuntime.get(
                BloomCosmeticsRuntime.equippedUrl("capes", players), "application/json", 5);
            BloomCosmeticsRuntime.HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenAccept(response -> {
                    if (response.statusCode() == 200) applyAssignments(players, response.body());
                })
                .exceptionally(error -> null)
                .whenComplete((unused, error) -> refreshing.set(false));
            return;
        } catch (Exception ignored) {
            // A temporary network failure should never affect Minecraft rendering.
        }
        refreshing.set(false);
    }

    private void applyAssignments(List<UUID> requestedPlayers, String body) {
        try {
            JsonArray items = JsonParser.parseString(body).getAsJsonObject().getAsJsonArray("items");
            Map<UUID, RemoteCape> remote = new HashMap<>();
            if (items != null) {
                for (JsonElement element : items) {
                    JsonObject item = element.getAsJsonObject();
                    UUID uuid = BloomCosmeticsRuntime.parseUuid(item.get("uuid").getAsString());
                    remote.put(uuid, new RemoteCape(
                        item.get("capeId").getAsString(),
                        item.get("textureRevision").getAsString(),
                        item.has("textureUrl") ? item.get("textureUrl").getAsString() : null,
                        parseAnimation(item)
                    ));
                }
            }

            for (UUID uuid : requestedPlayers) {
                RemoteCape next = remote.get(uuid);
                if (next == null) {
                    assignments.remove(uuid);
                    continue;
                }
                String assetKey = next.assetKey();
                CapeAssignment current = assignments.get(uuid);
                if (current != null && current.assetKey.equals(assetKey) && current.cape != null) continue;
                assignments.put(uuid, new CapeAssignment(assetKey, current == null ? null : current.cape));
                loadCape(next).thenAccept(cape -> {
                    CapeAssignment latest = assignments.get(uuid);
                    if (latest != null && latest.assetKey.equals(assetKey)) latest.cape = cape;
                }).exceptionally(error -> null);
            }
        } catch (Exception ignored) {
            // Ignore malformed remote data and keep the last known safe state.
        }
    }

    private RemoteAnimation parseAnimation(JsonObject item) {
        if (!item.has("animation") || item.get("animation").isJsonNull()) return null;
        JsonObject value = item.getAsJsonObject("animation");
        return new RemoteAnimation(
            value.get("revision").getAsString(),
            value.get("atlasUrl").getAsString(),
            value.get("frameCount").getAsInt(),
            value.get("columns").getAsInt(),
            value.get("rows").getAsInt(),
            value.get("frameWidth").getAsInt(),
            value.get("frameHeight").getAsInt(),
            value.get("fps").getAsDouble(),
            !value.has("loop") || value.get("loop").getAsBoolean()
        );
    }

    private CompletableFuture<LoadedCape> loadCape(RemoteCape cape) {
        return capeLoads.computeIfAbsent(cape.assetKey(), unused -> requestCape(cape)
            .whenComplete((loaded, error) -> {
                if (error != null) capeLoads.remove(cape.assetKey());
            }));
    }

    private CompletableFuture<LoadedCape> requestCape(RemoteCape cape) {
        if (cape.animation != null) {
            return requestAnimatedCape(cape, cape.animation)
                .exceptionallyCompose(error -> requestStaticCape(cape));
        }
        return requestStaticCape(cape);
    }

    private CompletableFuture<LoadedCape> requestAnimatedCape(RemoteCape cape, RemoteAnimation animation) {
        var request = BloomCosmeticsRuntime.get(animation.atlasUrl, "image/png", 12);
        return BloomCosmeticsRuntime.HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofByteArray())
            .thenCompose(response -> decodeAnimationResponse(cape, animation, response));
    }

    private CompletableFuture<LoadedCape> requestStaticCape(RemoteCape cape) {
        if (cape.textureUrl != null && !cape.textureUrl.isBlank()) {
            var request = BloomCosmeticsRuntime.get(cape.textureUrl, "image/png", 8);
            return BloomCosmeticsRuntime.HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofByteArray())
                .thenCompose(response -> decodeStaticResponse(cape, response));
        }
        String leaseUrl = BloomCosmeticsRuntime.API_BASE + "/v1/capes/"
            + URLEncoder.encode(cape.capeId, StandardCharsets.UTF_8) + "/texture";
        var leaseRequest = BloomCosmeticsRuntime.get(leaseUrl, "application/json", 5);
        return BloomCosmeticsRuntime.HTTP.sendAsync(leaseRequest, HttpResponse.BodyHandlers.ofString())
            .thenCompose(leaseResponse -> {
                if (leaseResponse.statusCode() != 200) return CompletableFuture.failedFuture(new IllegalStateException("Cape lease unavailable"));
                JsonObject lease = JsonParser.parseString(leaseResponse.body()).getAsJsonObject();
                if (!cape.revision.equals(lease.get("revision").getAsString())) {
                    return CompletableFuture.failedFuture(new IllegalStateException("Cape revision changed"));
                }
                var textureRequest = BloomCosmeticsRuntime.get(lease.get("url").getAsString(), "image/png", 8);
                return BloomCosmeticsRuntime.HTTP.sendAsync(textureRequest, HttpResponse.BodyHandlers.ofByteArray());
            })
            .thenCompose(response -> decodeStaticResponse(cape, response));
    }

    private CompletableFuture<LoadedCape> decodeStaticResponse(RemoteCape cape, HttpResponse<byte[]> response) {
        if (response.statusCode() != 200 || response.body().length > MAX_STATIC_BYTES) {
            return CompletableFuture.failedFuture(new IllegalStateException("Cape texture unavailable"));
        }
        try {
            NativeImage image = NativeImage.read(response.body());
            if (!validFrameDimensions(image.getWidth(), image.getHeight())) {
                image.close();
                return CompletableFuture.failedFuture(new IllegalStateException("Invalid cape dimensions"));
            }
            return BloomCosmeticsRuntime.registerTexture(
                    "capes", cape.capeId, cape.revision, "Bloom cape " + cape.capeId, image)
                .thenApply(identifier -> LoadedCape.still(identifier));
        } catch (Exception error) {
            return CompletableFuture.failedFuture(error);
        }
    }

    private CompletableFuture<LoadedCape> decodeAnimationResponse(
        RemoteCape cape,
        RemoteAnimation animation,
        HttpResponse<byte[]> response
    ) {
        if (response.statusCode() != 200 || response.body().length > MAX_ATLAS_BYTES || !animation.valid()) {
            return CompletableFuture.failedFuture(new IllegalStateException("Cape animation unavailable"));
        }
        NativeImage atlas;
        try {
            atlas = NativeImage.read(response.body());
        } catch (Exception error) {
            return CompletableFuture.failedFuture(error);
        }
        if (atlas.getWidth() != animation.columns * animation.frameWidth
            || atlas.getHeight() != animation.rows * animation.frameHeight
            || atlas.getWidth() > 4096 || atlas.getHeight() > 4096) {
            atlas.close();
            return CompletableFuture.failedFuture(new IllegalStateException("Invalid cape animation atlas"));
        }

        List<CompletableFuture<Identifier>> registrations = new ArrayList<>(animation.frameCount);
        try {
            for (int index = 0; index < animation.frameCount; index++) {
                int sourceX = (index % animation.columns) * animation.frameWidth;
                int sourceY = (index / animation.columns) * animation.frameHeight;
                NativeImage frame = new NativeImage(animation.frameWidth, animation.frameHeight, true);
                for (int y = 0; y < animation.frameHeight; y++) {
                    for (int x = 0; x < animation.frameWidth; x++) {
                        frame.setColorArgb(x, y, atlas.getColorArgb(sourceX + x, sourceY + y));
                    }
                }
                registrations.add(BloomCosmeticsRuntime.registerTexture(
                    "capes", cape.capeId,
                    animation.revision + "-frame-" + index,
                    "Bloom animated cape " + cape.capeId + " frame " + index,
                    frame
                ));
            }
        } catch (Throwable error) {
            atlas.close();
            return CompletableFuture.failedFuture(error);
        }
        atlas.close();
        return CompletableFuture.allOf(registrations.toArray(CompletableFuture[]::new))
            .thenApply(unused -> new LoadedCape(
                registrations.stream().map(CompletableFuture::join).toList(),
                animation.fps,
                animation.loop
            ));
    }

    private boolean validFrameDimensions(int width, int height) {
        return width == height * 2 && width >= 64 && width <= 2048
            && height >= 32 && height <= 1024 && width % 64 == 0 && height % 32 == 0;
    }

    private record RemoteCape(String capeId, String revision, String textureUrl, RemoteAnimation animation) {
        private String assetKey() {
            return capeId + ":" + revision + (animation == null ? "" : ":animated:" + animation.revision);
        }
    }

    private record RemoteAnimation(
        String revision,
        String atlasUrl,
        int frameCount,
        int columns,
        int rows,
        int frameWidth,
        int frameHeight,
        double fps,
        boolean loop
    ) {
        private boolean valid() {
            return revision != null && !revision.isBlank() && atlasUrl != null && !atlasUrl.isBlank()
                && frameCount >= 1 && frameCount <= 120 && columns >= 1 && rows >= 1
                && columns * rows >= frameCount && frameWidth >= 64 && frameWidth <= 2048
                && frameHeight >= 32 && frameHeight <= 1024 && frameWidth == frameHeight * 2
                && frameWidth % 64 == 0 && frameHeight % 32 == 0
                && Double.isFinite(fps) && fps >= 1.0 && fps <= 30.0;
        }
    }

    private static final class LoadedCape {
        private final List<Identifier> frames;
        private final double fps;
        private final boolean loop;
        private final long startedAtNanos = System.nanoTime();

        private LoadedCape(List<Identifier> frames, double fps, boolean loop) {
            this.frames = frames;
            this.fps = fps;
            this.loop = loop;
        }

        private static LoadedCape still(Identifier texture) {
            return new LoadedCape(List.of(texture), 0.0, false);
        }

        private Identifier textureNow() {
            if (frames.size() == 1 || fps <= 0.0) return frames.getFirst();
            long elapsedNanos = Math.max(0L, System.nanoTime() - startedAtNanos);
            long frame = (long) Math.floor(elapsedNanos / 1_000_000_000.0 * fps);
            int index = loop ? (int) (frame % frames.size()) : (int) Math.min(frame, frames.size() - 1L);
            return frames.get(index);
        }
    }

    private static final class CapeAssignment {
        private final String assetKey;
        private volatile LoadedCape cape;

        private CapeAssignment(String assetKey, LoadedCape cape) {
            this.assetKey = assetKey;
            this.cape = cape;
        }
    }
}
