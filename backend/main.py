from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.database import get_db
from app.routers.api import router
from app.services.rules_engine import run_overdue_check, run_calibration_check
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("act-backend")

scheduler = BackgroundScheduler()


def scheduled_overdue_check():
    db = next(get_db())
    try:
        result = run_overdue_check(db)
        if result["alerts_created"] > 0:
            logger.info(f"Overdue check: {result}")
    except Exception as e:
        logger.error(f"Overdue check failed: {e}")
    finally:
        db.close()


def scheduled_calibration_check():
    db = next(get_db())
    try:
        result = run_calibration_check(db)
        if result["alerts_created"] > 0:
            logger.info(f"Calibration check: {result}")
    except Exception as e:
        logger.error(f"Calibration check failed: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background scheduler
    scheduler.add_job(scheduled_overdue_check, "interval", minutes=5, id="overdue_check")
    scheduler.add_job(scheduled_calibration_check, "interval", hours=1, id="calibration_check")
    scheduler.start()
    logger.info("Background scheduler started — overdue check every 5 min, calibration check every 1 hr")

    # Run once on startup
    scheduled_calibration_check()
    scheduled_overdue_check()

    yield

    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(
    title="ACT System API",
    description="""
## MSME Asset Custody & Tracking System
**IISc Bangalore**

### Key Endpoints
- `POST /custody/scan` — Universal scan (checkout or return auto-detected)
- `POST /custody/checkout` — Explicit checkout
- `POST /custody/return` — Explicit return
- `GET /dashboard/summary` — Live dashboard counts
- `GET /dashboard/active-custody` — All currently checked-out items
- `GET /alerts` — Open alerts
- `POST /assets/{id}/calibration` — Record new calibration
    """,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "act-backend", "version": "1.0.0"}


@app.get("/")
def root():
    return {
        "message": "ACT System Backend",
        "docs": "/docs",
        "api": "/api/v1",
        "health": "/health",
    }
