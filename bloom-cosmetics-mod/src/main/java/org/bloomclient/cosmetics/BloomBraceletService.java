package org.bloomclient.cosmetics;

import com.google.gson.*;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.entity.Entity;
import net.minecraft.util.Identifier;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Lightweight live bracelet assignment service. Network work never runs on the render thread. */
public final class BloomBraceletService {
    private static final String API = "https://api.north.bloomclient.org/minecraft";
    private static final long ACTIVE_MS = 20_000L;
    private static final BloomBraceletService INSTANCE = new BloomBraceletService();
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).followRedirects(HttpClient.Redirect.NORMAL).build();
    private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "Bloom-Bracelet-Refresh"); thread.setDaemon(true); thread.setPriority(Thread.MIN_PRIORITY); return thread;
    });
    private final ConcurrentHashMap<UUID, Long> observed = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Assignment> assignments = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<BraceletAsset>> loads = new ConcurrentHashMap<>();
    private final AtomicBoolean started = new AtomicBoolean();
    private final AtomicBoolean refreshing = new AtomicBoolean();

    public static BloomBraceletService get() { return INSTANCE; }
    public void start() {
        if (!started.compareAndSet(false, true)) return;
        worker.scheduleWithFixedDelay(this::refresh, 0, 2, TimeUnit.SECONDS);
    }
    public BraceletAsset assetFor(int entityId) {
        MinecraftClient minecraft = MinecraftClient.getInstance();
        if (minecraft.world == null) return null;
        Entity entity = minecraft.world.getEntityById(entityId);
        if (!(entity instanceof AbstractClientPlayerEntity player)) return null;
        long now = System.currentTimeMillis();
        observed.compute(player.getUuid(), (uuid, last) -> last == null || now - last >= 1_000 ? now : last);
        Assignment assignment = assignments.get(player.getUuid());
        return assignment == null ? null : assignment.asset;
    }
    private void refresh() {
        if (!refreshing.compareAndSet(false, true)) return;
        try {
            long cutoff = System.currentTimeMillis() - ACTIVE_MS;
            observed.entrySet().removeIf(entry -> entry.getValue() < cutoff);
            if (observed.isEmpty()) { refreshing.set(false); return; }
            List<UUID> players = observed.keySet().stream().limit(100).toList();
            String joined = players.stream().map(BloomBraceletService::compact).reduce((a,b) -> a + "," + b).orElse("");
            HttpRequest request = HttpRequest.newBuilder(URI.create(API + "/v1/bracelets/equipped?uuids=" + URLEncoder.encode(joined, StandardCharsets.UTF_8)))
                .timeout(Duration.ofSeconds(5)).header("Accept", "application/json").header("User-Agent", "Bloom-Cosmetics/1.4.0").GET().build();
            client.sendAsync(request, HttpResponse.BodyHandlers.ofString()).thenAccept(response -> {
                if (response.statusCode() == 200) apply(players, response.body());
            }).exceptionally(error -> null).whenComplete((unused, error) -> refreshing.set(false));
            return;
        } catch (Exception ignored) { }
        refreshing.set(false);
    }
    private void apply(List<UUID> players, String body) {
        try {
            JsonArray items = JsonParser.parseString(body).getAsJsonObject().getAsJsonArray("items");
            Map<UUID, Remote> remote = new HashMap<>();
            if (items != null) for (JsonElement element : items) {
                JsonObject item = element.getAsJsonObject();
                JsonArray offset = item.getAsJsonArray("offset"), rotation = item.getAsJsonArray("rotation"), pivot = item.getAsJsonArray("pivot");
                UUID uuid = parseUuid(item.get("uuid").getAsString());
                remote.put(uuid, new Remote(item.get("braceletId").getAsString(), item.get("modelRevision").getAsString(), item.get("textureRevision").getAsString(),
                    item.get("modelUrl").getAsString(), item.get("textureUrl").getAsString(), vector(offset,0), vector(offset,1), vector(offset,2),
                    vector(rotation,0), vector(rotation,1), vector(rotation,2), vector(pivot,0), vector(pivot,1), vector(pivot,2),
                    item.get("scale").getAsFloat(), "left".equals(item.get("arm").getAsString())));
            }
            for (UUID uuid : players) {
                Remote next = remote.get(uuid);
                if (next == null) { assignments.remove(uuid); continue; }
                String key = next.id + ":" + next.modelRevision + ":" + next.textureRevision + ":" + next.leftArm;
                Assignment current = assignments.get(uuid);
                if (current != null && current.key.equals(key) && current.asset != null) continue;
                assignments.put(uuid, new Assignment(key, current == null ? null : current.asset));
                load(next).thenAccept(asset -> { Assignment latest = assignments.get(uuid); if (latest != null && latest.key.equals(key)) latest.asset = asset; }).exceptionally(error -> null);
            }
        } catch (Exception ignored) { }
    }
    private static float vector(JsonArray value, int index) { return value == null || value.size() <= index ? 0 : value.get(index).getAsFloat(); }
    private CompletableFuture<BraceletAsset> load(Remote value) {
        String key = value.id + ":" + value.modelRevision + ":" + value.textureRevision;
        return loads.computeIfAbsent(key, unused -> downloadModel(value).thenCombine(downloadTexture(value), (mesh, texture) ->
            new BraceletAsset(mesh, texture, value.ox, value.oy, value.oz, value.rx, value.ry, value.rz, value.px, value.py, value.pz, value.scale, value.leftArm)
        ).whenComplete((asset, error) -> { if (error != null) loads.remove(key); }));
    }
    private CompletableFuture<BloomHatMesh> downloadModel(Remote value) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(value.modelUrl)).timeout(Duration.ofSeconds(8)).header("Accept", "application/json").header("User-Agent", "Bloom-Cosmetics/1.4.0").GET().build();
        return client.sendAsync(request, HttpResponse.BodyHandlers.ofByteArray()).thenCompose(response -> {
            if (response.statusCode() != 200 || response.body().length > 2 * 1024 * 1024) return CompletableFuture.failedFuture(new IllegalStateException("Bracelet model unavailable"));
            try { return CompletableFuture.completedFuture(BloomHatMesh.parse(new String(response.body(), StandardCharsets.UTF_8))); }
            catch (Exception error) { return CompletableFuture.failedFuture(error); }
        });
    }
    private CompletableFuture<Identifier> downloadTexture(Remote value) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(value.textureUrl)).timeout(Duration.ofSeconds(8)).header("Accept", "image/png").header("User-Agent", "Bloom-Cosmetics/1.4.0").GET().build();
        return client.sendAsync(request, HttpResponse.BodyHandlers.ofByteArray()).thenCompose(response -> {
            if (response.statusCode() != 200 || response.body().length > 8 * 1024 * 1024) return CompletableFuture.failedFuture(new IllegalStateException("Bracelet texture unavailable"));
            try { NativeImage image = NativeImage.read(response.body()); return register(value, image); }
            catch (Exception error) { return CompletableFuture.failedFuture(error); }
        });
    }
    private CompletableFuture<Identifier> register(Remote value, NativeImage image) {
        CompletableFuture<Identifier> result = new CompletableFuture<>();
        Identifier id = Identifier.of("bloom_cosmetics", "bracelets/" + value.id + "/" + value.textureRevision.toLowerCase().replaceAll("[^a-z0-9_.-]", "-"));
        MinecraftClient.getInstance().execute(() -> {
            try { MinecraftClient.getInstance().getTextureManager().registerTexture(id, new NativeImageBackedTexture(() -> "Bloom bracelet " + value.id, image)); result.complete(id); }
            catch (Throwable error) { image.close(); result.completeExceptionally(error); }
        });
        return result;
    }
    private static String compact(UUID uuid) { return uuid.toString().replace("-", "").toLowerCase(); }
    private static UUID parseUuid(String value) { String v = value.replace("-", "").toLowerCase(); return UUID.fromString(v.substring(0,8)+"-"+v.substring(8,12)+"-"+v.substring(12,16)+"-"+v.substring(16,20)+"-"+v.substring(20)); }
    private record Remote(String id, String modelRevision, String textureRevision, String modelUrl, String textureUrl,
        float ox,float oy,float oz,float rx,float ry,float rz,float px,float py,float pz,float scale,boolean leftArm) { }
    private static final class Assignment { final String key; volatile BraceletAsset asset; Assignment(String key, BraceletAsset asset) { this.key=key; this.asset=asset; } }
    public record BraceletAsset(BloomHatMesh mesh, Identifier texture, float offsetX,float offsetY,float offsetZ,
        float rotationX,float rotationY,float rotationZ,float pivotX,float pivotY,float pivotZ,float scale,boolean leftArm) { }
}
