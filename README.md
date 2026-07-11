# Bloom Client V2

> A modern, open-source Minecraft launcher built to make creating, customizing, and optimizing instances feel effortless.

Bloom Client is a clean desktop launcher for Minecraft: Java Edition. It brings instances, mods, downloads, account management, performance tools, and launch settings together in one polished interface—without making the simple things complicated.

V2 is a ground-up rebuild of the original Bloom Client. It is designed around speed, reliability, a consistent visual language, and a codebase that can grow without becoming difficult to maintain.

## What Bloom can do

- Create and launch isolated Vanilla and Fabric instances
- Browse and install compatible mods from Modrinth
- Import Fabric modpacks from `.mrpack` and `.zip` files
- Manage installed mods, resource packs, shaders, icons, and instance settings
- Detect local Java installations and select an appropriate runtime
- Configure memory allocation, JVM arguments, resolution, and launch behavior
- Track real installation and launch progress from the Downloads page
- View live Minecraft output and launch failures from the Logs page
- Sign in with a Microsoft Minecraft account and keep the session securely available between launches
- Personalize the client with multiple themes and accent colors

## Bloom AutoTune

Bloom AutoTune is an experimental performance system that uses real measurements instead of relying only on generic hardware recommendations.

Its fixed-seed Minecraft benchmark records average FPS, 1% lows, frame times, and Java memory usage in a consistent environment. Bloom can use those results to create a performance profile and apply matching Minecraft graphics, memory, and JVM settings across instances.

The benchmark runs locally, and its results remain on the user's computer.

## Built for a better launcher experience

Bloom keeps every Minecraft setup in its own instance. Each instance can have a separate game version, mod loader, memory limit, Java runtime, icon, mods, resource packs, shaders, and launch configuration. This makes it easier to experiment with modpacks or different versions without turning one Minecraft folder into a mess.

The client is currently focused on Windows, with a responsive interface designed specifically for a desktop launcher rather than a web page placed inside a window.

## Project status

Bloom Client V2 is under active development. Core launching, instance management, Fabric support, Modrinth integration, downloads, logs, Microsoft authentication, and AutoTune are being developed and refined as part of the V2 foundation.

Expect interfaces and internal APIs to evolve before the first stable release.

## Technical overview

Bloom Client uses a native desktop architecture:

```text
React + TypeScript interface
            |
         Tauri API
            |
        Rust commands
            |
Windows, files, downloads, Java, and Minecraft
```

| Technology | Purpose |
| --- | --- |
| React | Screens, navigation, components, and user interactions |
| TypeScript | Typed frontend behavior, services, and application models |
| Vite | Local development and production frontend builds |
| Tauri | Secure bridge between the interface and native functionality |
| Rust | Filesystem access, downloads, authentication, Java detection, installation, and process launching |

### Repository layout

| Path | Responsibility |
| --- | --- |
| `src/` | React screens, interface components, frontend services, and shared types |
| `src-tauri/` | Rust launcher implementation and native platform integration |
| `benchmark-mod/` | Fabric mod used by the Bloom AutoTune Minecraft benchmark |
| `.github/workflows/` | Automated checks and desktop build workflows |

## Development

### Prerequisites

- Node.js 20 or newer
- Rust stable
- Tauri's Windows prerequisites
- Git

### Run Bloom locally

```powershell
npm install
npm run tauri dev
```

### Quality checks

```powershell
npm run typecheck
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

## Contributing

Contributions, bug reports, and thoughtful feature proposals are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

For interface changes, include screenshots or a short recording whenever possible. Keep changes focused, explain their user-facing impact, and make sure the project checks pass before requesting review.

## License

Bloom Client is released under the [MIT License](LICENSE).
