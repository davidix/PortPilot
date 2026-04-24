# PortPilot

**Local port dashboard for developers.** A small monorepo that scans what is listening on your machine—TCP listeners via `lsof` and published Docker ports via `docker inspect`—and surfaces them in a grouped UI with quick-open links. Use the **web dashboard**, the **Chrome extension** (MV3), or both against the same loopback API.

Repository: [github.com/davidix/PortPilot](https://github.com/davidix/PortPilot)

## What you get

- **Agent** — Fastify HTTP API on `127.0.0.1:7878` (`/api/health`, `/api/scan`)
- **Dashboard** — Vite + React + Tailwind
- **Extension** — Popup + background worker with badge refresh
- **Shared package** — TypeScript types and port/service classification helpers

## Monorepo layout

| Path | Role |
|------|------|
| `apps/agent` | Fastify API |
| `apps/dashboard` | Vite + React + Tailwind UI |
| `apps/extension` | Chrome MV3 extension (build output in `apps/extension/dist`) |
| `packages/shared` | Shared types and helpers |

## Prerequisites

- **Node.js** 18+
- **[pnpm](https://pnpm.io)** 9 (see `packageManager` in root `package.json`)
- **macOS / Linux** with `lsof` (standard on macOS)
- **Optional:** Docker CLI for container port mapping (skipped if missing or the daemon is down)

## Install

```bash
git clone https://github.com/davidix/PortPilot.git
cd PortPilot
pnpm install
pnpm run build:shared
```

## Scripts (root)

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | Build shared once, then agent + dashboard in parallel |
| `pnpm run dev:all` | Same as `dev`, plus extension watch build |
| `pnpm run dev:agent` / `dev:dashboard` / `dev:extension` | Single package dev |
| `pnpm run build` | Build shared, then all other workspace packages |
| `pnpm run build:shared` | Build `@portpilot/shared` only |
| `pnpm run typecheck` | Typecheck all packages |

## Run the agent

```bash
pnpm run dev:agent
```

Defaults:

- **Host:** `127.0.0.1` (not bound to the LAN)
- **Port:** `7878`
- **Overrides:** `PORTPILOT_HOST`, `PORTPILOT_PORT`

Endpoints:

- `GET /api/health`
- `GET /api/scan`
- `POST /api/process/:pid/kill` — **disabled by default.** Enable with `PORTPILOT_ENABLE_KILL=true` and send JSON `{ "confirm": true }` for an explicit `SIGTERM`. Nothing is killed automatically.

## Run the dashboard

In another terminal:

```bash
pnpm run dev:dashboard
```

Open the URL Vite prints (typically `http://localhost:5173`).

To use a non-default agent base URL, create `apps/dashboard/.env.local`:

```bash
VITE_AGENT_URL=http://127.0.0.1:7878
```

## Chrome extension

Build (after shared is built):

```bash
pnpm run build:shared
pnpm run build --filter @portpilot/extension
```

Load unpacked from `apps/extension/dist`:

1. Chrome → **Extensions** → turn on **Developer mode**
2. **Load unpacked** → choose the `apps/extension/dist` folder

The extension calls `http://127.0.0.1:7878` (see `host_permissions` in `apps/extension` `manifest.json`).

For a watch build while developing:

```bash
pnpm run dev:extension
```

(Start the agent first so the UI has something to talk to.)

## Safety notes

- No `sudo` required; some fields (cwd, command) may be omitted for processes you do not own.
- The agent listens on loopback only.
- CORS allows `localhost` / `127.0.0.1` and `chrome-extension://` for the extension and local dev.

## License

MIT
