# RUNBOOK.md

## Requirements

- Node.js 18+
- npm 9+

---

## Phase 1 & 2 — Frontend only (mock AI)

Phases 1 and 2 run as a single Vite dev server. No backend required.

```bash
cd workspace
npm install
npm run dev
```

Open `http://localhost:5173`.

### Other commands

```bash
npm run build      # Type-check + production build → workspace/dist/
npm run preview    # Serve the production build locally
npm run lint       # Run oxlint
```

---

## Phase 3 — With real OpenAI (Express proxy)

The API key lives only in the server process. The Express server reads it from `.env` and proxies
`/api/ai/*` calls to OpenAI. Vite forwards `/api` traffic to the Express server during development.

### First-time setup

```bash
# 1. Install root-level server deps (from repo root)
npm install

# 2. Install workspace (client) deps
npm install --prefix workspace

# 3. Fill in your OpenAI key in the root .env
#    (file is already created — just replace the placeholder)
#    OPENAI_API_KEY=sk-...

# 4. Switch the client to use the proxy
#    Edit workspace/.env:
#    VITE_AI_PROVIDER=proxy
```

### Run (development)

Run **from the repo root** — `concurrently` starts both Vite (port 5173) and Express (port 3001):

```bash
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to Express automatically.

### Run (production)

```bash
# Build client bundle + compile server TypeScript (from repo root)
npm run build

# Start Express — serves workspace/dist/ and handles /api routes
npm start
```

Open `http://localhost:3001`.

### Switching back to mock AI

```env
# workspace/.env
VITE_AI_PROVIDER=mock
```

No code changes needed — restart the dev server and the mock takes over.

---

## Environment variables

| Variable | File | Read by | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | `.env` (repo root) | Express server only | OpenAI API key — never sent to browser |
| `PORT` | `.env` (repo root) | Express server | HTTP port (default: 3001) |
| `VITE_AI_PROVIDER` | `workspace/.env` | Vite client bundle | `mock` (default) or `proxy` |

Both `.env` files are git-ignored. `workspace/.env.example` is committed with stub values.
