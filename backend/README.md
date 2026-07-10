# Bloom Minecraft API foundation

This directory contains the small public API boundary used by Bloom Client. It intentionally exposes only health and capability discovery today. Modrinth and CurseForge adapters will be added behind this boundary later.

The API runs inside the isolated Minecraft Supabase Compose project on the Mac VM. It must not receive DEFYND credentials or expose Postgres, Supavisor, Supabase Studio, or service-role keys.

Public endpoint: `https://api.north.bloomclient.org/minecraft`

Current routes:

- `GET /health`
- `GET /v1/capabilities`

Provider capability flags remain `false` until their real adapters and database migrations exist.

Deploy or update the API from `/opt/minecraft-supabase` with:

```sh
sudo docker compose --env-file .env -p minecraft-supabase \
  -f docker-compose.yml -f compose.backend.yml up -d --build minecraft-api
```
