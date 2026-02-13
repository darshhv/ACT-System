import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ACT Edge Node API",
    description="ACT System Edge Node — scan capture & offline buffer",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EDGE_NODE_ID = os.getenv("EDGE_NODE_ID", "EDGE-001")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "act-edge",
        "node_id": EDGE_NODE_ID,
        "version": "0.1.0",
    }


@app.get("/")
def root():
    return {
        "message": "ACT Edge Node",
        "node_id": EDGE_NODE_ID,
        "docs": "/docs",
        "health": "/health",
    }
