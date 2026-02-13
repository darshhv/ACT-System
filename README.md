# ACT System — Asset Custody & Tracking

MSME Tool Room Management System  
IISc Bangalore · Research Software Engineering

---

## Quick Start

```bash
# Start all services
docker compose up --build

# Start in background
docker compose up --build -d

# Stop everything
docker compose down

# Stop and wipe database (fresh start)
docker compose down -v
```

---

## Services & Ports

| Service   | URL                        | Purpose                        |
|-----------|----------------------------|--------------------------------|
| Frontend  | http://localhost:3000      | React dashboard                |
| Backend   | http://localhost:8000      | FastAPI app server             |
| Backend Docs | http://localhost:8000/docs | Swagger UI (API explorer)   |
| Edge Node | http://localhost:8001      | Scan capture service           |
| Edge Docs | http://localhost:8001/docs | Edge API explorer              |
| Nginx     | http://localhost:80        | Reverse proxy (unified entry)  |
| PostgreSQL| localhost:5432             | Database (direct access)       |
| Redis     | localhost:6379             | Cache / message queue          |

---

## Project Structure

```
act-system/
├── backend/          # FastAPI app server (Python)
├── edge/             # Edge node service (Python)
├── frontend/         # React 18 + Vite dashboard
├── postgres/
│   └── init/         # SQL scripts run on first DB startup
├── nginx/            # Reverse proxy config
├── scripts/          # Utility scripts
├── docker-compose.yml
└── .env              # All environment variables
```

---

## Build Layers

- [x] Layer 1 — Project scaffold & Docker environment
- [ ] Layer 2 — Database schema & DDL (PostgreSQL)
- [ ] Layer 3 — Backend API (custody, events, rules, alerts)
- [ ] Layer 4 — Edge node (scan capture, offline buffer, sync)
- [ ] Layer 5 — Frontend dashboard (live custody, alerts, reports)

---

## Environment

Copy `.env` and adjust for your environment. Never commit real credentials.
