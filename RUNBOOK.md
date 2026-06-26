# RUNBOOK.md

## Requirements

- Node.js 18+
- npm 9+

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

> Phase 3 is not yet implemented. This section describes the intended setup once the Express server is added.

The API key must never go in the client bundle. The Express server reads it from `.env` and proxies `/api/ai/*` requests to OpenAI. Vite forwards `/api` traffic to the Express server during development.

### Setup

```bash
# 1. Copy the env template and fill in your key
cp .env.example .env
# Edit .env:
#   OPENAI_API_KEY=sk-...
#   VITE_AI_PROVIDER=openai   # switch from "mock" to "openai"
```

### Run (development)

Two processes run concurrently — Vite on port 5173, Express on port 3001. Vite proxies `/api` to Express.

```bash
cd workspace
npm run dev        # starts both via concurrently
```

### Run (production)

```bash
cd workspace
npm run build      # builds Vite output to dist/
npm start          # Express serves dist/ + handles /api routes on port 3001
```

Open `http://localhost:3001`.

### Switching back to mock

```env
# .env
VITE_AI_PROVIDER=mock
```

No code changes needed — the UI is identical in all modes.

---

## Environment variables

| Variable | Where it's read | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Server (`process.env`) only | OpenAI API key — never sent to the client |
| `VITE_AI_PROVIDER` | Client bundle | `mock` (default) or `openai` |

`.env` is git-ignored. `.env.example` is committed with stub values.
