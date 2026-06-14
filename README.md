# Xeno Mini CRM

AI-native Mini CRM for Indian retail brands. Three independently runnable services.

```
backend/          — Express API server (Node.js + TypeScript)
channel-service/  — Delivery simulation micro-service (Node.js + TypeScript)
frontend/         — React + Vite UI
```

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL
npm run dev            # http://localhost:8080
```

**Environment variables:**
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default `8080`) |
| `CHANNEL_SERVICE_URL` | URL of the channel-service (optional — falls back to inline simulation) |

### 2. Channel Service

```bash
cd channel-service
npm install
cp .env.example .env   # same DATABASE_URL as backend
npm run dev            # http://localhost:8081
```

**Environment variables:**
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (same DB as backend) |
| `PORT` | Server port (default `8081`) |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:8080`.

**Environment variables (optional):**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL for API proxy (default `http://localhost:8080`) |

---

## Architecture

```
Browser
  │
  ├─ GET /  →  frontend (Vite/React, port 5173)
  │              └─ /api/* proxied to backend
  │
  └─ /api/* →  backend (Express, port 8080)
                 ├─ POST /api/campaigns/:id/send
                 │    └─ POST http://channel-service:8081/deliver  (fire-and-forget)
                 └─ all other routes served directly
```

**Channel service** receives a list of communications, then asynchronously simulates delivery (80% delivered → 60% opened → 40% clicked) by updating the database over several seconds.

**AI chat** uses Groq (`llama-3.3-70b-versatile`). The API key is sent from the browser via `X-Api-Key` header and never stored server-side.

---

## Database

All three services share the same PostgreSQL database.

Tables: `customers`, `orders`, `campaigns`, `communications`, `campaign_stats`

To seed sample data: click **Seed Database** on the dashboard, or `POST /api/seed`.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/customers` | List customers (search, filter) |
| POST | `/api/customers/bulk` | Bulk insert customers |
| POST | `/api/orders/bulk` | Bulk insert orders |
| GET | `/api/stats/overview` | Dashboard stats |
| POST | `/api/segments/preview` | Preview segment count |
| GET | `/api/campaigns` | List campaigns with stats |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Get campaign |
| POST | `/api/campaigns/:id/send` | Send campaign |
| GET | `/api/campaigns/:id/stats` | Get campaign stats |
| POST | `/api/receipts` | Update delivery status |
| POST | `/api/ai/chat` | AI campaign assistant (Groq) |
| POST | `/api/seed` | Seed 50 customers + 200 orders |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot-reload (tsx watch) |
| `npm run start` | Start without hot-reload |
| `npm run typecheck` | TypeScript type check |
| `npm run build` | Compile to `dist/` (frontend) |
