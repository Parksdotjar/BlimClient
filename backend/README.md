# Bloom Minecraft API foundation

This directory contains the small public API boundary used by Bloom Client. It exposes health and capability discovery plus the Fabric-only Modrinth catalog adapter. CurseForge remains disabled until a server-side API key and rate-limit policy are available.

The API runs inside the isolated Minecraft Supabase Compose project on the Mac VM. It must not receive DEFYND credentials or expose Postgres, Supavisor, Supabase Studio, or service-role keys.

Public endpoint: `https://api.north.bloomclient.org/minecraft`

Current routes:

- `GET /health`
- `GET /v1/capabilities`
- `GET /v1/catalog/search?query=&gameVersion=1.21.1&loader=fabric&offset=0`
- `GET /v1/catalog/modrinth/:projectId/install?gameVersion=1.21.1`

The catalog normalizes Modrinth results, caches provider responses briefly, resolves an exact Fabric/game-version file, and includes required Modrinth dependencies in its install plan. CurseForge and remote modpack capability flags remain `false`.

Deploy or update the API from `/opt/minecraft-supabase` with:

```sh
sudo docker compose --env-file .env -p minecraft-supabase \
  -f docker-compose.yml -f compose.backend.yml up -d --build minecraft-api
```
