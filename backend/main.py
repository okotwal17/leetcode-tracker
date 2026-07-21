import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import ConnectionFailure

from database import client
from indexes import ensure_indexes
from problems.problemRoutes import problemRouter

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()     # startup happens above this line
    yield
    await client.close()       # shutdown below it

app = FastAPI(title="Leetcode Tracker", version="1.0", lifespan=lifespan)


@app.exception_handler(ConnectionFailure)
async def db_unavailable(request: Request, exc: ConnectionFailure):
    """Mongo unreachable -> 503 (transient, retryable) instead of a bare 500.
    Covers every endpoint at once: all pymongo connection errors subclass this.
    """
    logger.error("Database unavailable on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Database temporarily unavailable, please retry."},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problemRouter)
