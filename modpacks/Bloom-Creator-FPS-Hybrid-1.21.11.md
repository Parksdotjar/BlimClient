# Bloom Creator FPS Hybrid

**Pack version:** 1.0.0  
**Minecraft:** 1.21.11  
**Loader:** Fabric 0.19.3  
**Base:** Fabulously Optimized 12.2.2

Bloom Creator FPS Hybrid keeps Fabulously Optimized's proven Sodium/Iris rendering stack and layers in creator tools, PvP information, voice chat, multiplayer conveniences, and hardware-safe optimizations.

## Major additions

- Essential Mod
- Flashback
- Simple Voice Chat
- uku's Armor HUD and ukulib
- Freecam and Camera Utils
- BetterF3
- Chat Heads
- Shulker Box Tooltip
- AppleSkin and Mouse Tweaks
- TotemCounter, PotionCounter, and BetterShields
- BadOptimizations, ThreadTweak, Krypton, Particle Core, and Fast IP Ping
- Nvidium for supported NVIDIA GPUs

## Included optional resource packs

- Low Fire
- Low Shield
- Short Swords
- Fresh Animations
- Fullbright UB

Enable the resource packs you want from Minecraft's Resource Packs screen. They are not force-enabled, so users can choose their preferred PvP and creator visuals.

## Compatibility decisions

- Nvidium is included because it automatically disables itself on unsupported hardware. It also disables itself while Iris shaders are active.
- VulkanMod is intentionally excluded because it replaces the OpenGL renderer and conflicts with the Sodium/Iris-centered Fabulously Optimized stack.
- ReplayMod is intentionally excluded because Flashback fills the same recording/replay role.
- ModernFix and Noisium were not added because they did not have a current Fabric 1.21.11 release during this build.
- Aggressive experimental optimizers were avoided where they duplicated Fabulously Optimized or introduced a higher crash risk.

## Files

- `Bloom-Creator-FPS-Hybrid-1.21.11-v1.0.0.mrpack` — import this into Bloom Client or another Modrinth-compatible launcher.
- `Bloom-Creator-FPS-Hybrid-1.21.11.manifest.json` — exact pinned additions and versions used by the build.
- `../tools/build-creator-hybrid-pack.mjs` — reproducible pack builder.

## Notes

Simple Voice Chat still requires compatible server support for proximity voice. Freecam may be prohibited on some multiplayer servers, so users should follow each server's rules.
