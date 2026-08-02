import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import ConnectionFailure

from slowapi.errors import RateLimitExceeded

from auth.authRoutes import authRouter
from database import client
from indexes import ensure_indexes
from problems.problemRoutes import problemRouter
from rateLimit import GlobalRateLimitMiddleware, limiter, rate_limit_handler

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()     # startup happens above this line
    yield
    await client.close()       # shutdown below it

app = FastAPI(title="LeetCache", version="1.0", lifespan=lifespan)

# slowapi reads the limiter off app.state rather than from a closure, so this
# assignment is load-bearing: without it every request raises AttributeError.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


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

# Applies the global limits to every route, before routing
app.add_middleware(GlobalRateLimitMiddleware)

# Origins the browser is allowed to call this API from. The Vite dev server can be
# reached at either host, and the browser treats them as *distinct* origins, so we
# list both. Add the deployed frontend's URL here when we ship.
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
)

app.include_router(authRouter)
app.include_router(problemRouter)
