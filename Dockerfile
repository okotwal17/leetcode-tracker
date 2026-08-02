# syntax=docker/dockerfile:1

# --- stage 1: build the frontend ----------------------------------------------
FROM node:22-alpine AS frontend

WORKDIR /build

# Manifests first: this layer stays cached until the dependencies actually change.
COPY frontend/Leetcode_Tracker/package.json frontend/Leetcode_Tracker/package-lock.json ./
RUN npm ci

COPY frontend/Leetcode_Tracker/ ./

# A relative base means the bundle calls its own origin, so there is no hostname
# baked in and no CORS involved. Overrides the localhost value in .env.
ENV VITE_API_URL=/api

# Public by design — it identifies the app to Google from inside the browser — but
# it must be present at BUILD time because Vite inlines it into the bundle. ARG
# rather than ENV: build args reach RUN as env vars without persisting anywhere.
ARG VITE_GOOGLE_CLIENT_ID

RUN npm run build


# --- stage 2: the API, which also serves that bundle ---------------------------
FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Dependencies before source, so editing a route doesn't reinstall the world.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ ./

# main.py looks for the bundle here and skips the static mount if it's absent.
COPY --from=frontend /build/dist ./static

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

# Cloud Run injects PORT (8080) and `fastapi run` reads it from the environment.
# --proxy-headers is what makes the rate limiter key on the real client IP rather
# than lumping every logged-out user behind Google's front end into one bucket.
EXPOSE 8080
CMD ["fastapi", "run", "main.py", "--host", "0.0.0.0", "--proxy-headers", "--forwarded-allow-ips", "*"]
