import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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

# Development only. In prod the built frontend is served by this same app (see the
# static mount below), so every API call is same-origin and never triggers CORS at
# all. The Vite dev server is the one case that *is* cross-origin, and the browser
# treats its two hostnames as distinct origins, so we list both.
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

# Everything the API serves lives under /api, so no API path can ever collide with a
# client-side route. Without this, "/problems" is both a React page and an endpoint,
# and a page refresh there returns raw JSON instead of the app.
app.include_router(authRouter, prefix="/api")
app.include_router(problemRouter, prefix="/api")


# --- the built frontend -------------------------------------------------------
# Absent in local dev (nobody builds to run `npm run dev`), so the whole block is
# conditional and the API behaves exactly as before when it isn't there.
FRONTEND_DIR = (Path(__file__).parent / "static").resolve()
INDEX_FILE = FRONTEND_DIR / "index.html"


class ImmutableStaticFiles(StaticFiles):
    """Vite content-hashes these filenames, so a given URL's bytes never change."""

    def file_response(self, *args, **kwargs) -> FileResponse:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


if INDEX_FILE.is_file():
    app.mount(
        "/assets",
        ImmutableStaticFiles(directory=FRONTEND_DIR / "assets"),
        name="assets",
    )

    # Registered last so it only sees paths nothing above matched.
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        """Serve the SPA shell for client-side routes; 404 anything else."""
        # An unmatched /api path is a bug or a typo, not a page. Returning HTML here
        # would surface it as an unparseable response rather than a clean 404.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        # A real file shipped at the bundle root: favicon.ico, robots.txt, and so on.
        candidate = (FRONTEND_DIR / full_path).resolve()
        if (
            full_path
            and candidate.is_relative_to(FRONTEND_DIR)  # no ../ escapes
            and candidate.is_file()
        ):
            return FileResponse(candidate)

        # Something with a file extension is a missing asset, not a client route.
        # Handing back index.html would make the browser fail to parse HTML as JS.
        if "." in full_path.rsplit("/", 1)[-1]:
            raise HTTPException(status_code=404, detail="Not found")

        # index.html must never be cached: it names the hashed asset files, and a
        # stale copy points at bundles that no longer exist after the next deploy.
        return FileResponse(INDEX_FILE, headers={"Cache-Control": "no-cache"})
