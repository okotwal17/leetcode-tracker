from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import client
from indexes import ensure_indexes
from problemRoutes import problemRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()     # startup happens above this line
    yield
    await client.close()       # shutdown below it

app = FastAPI(title="Leetcode Tracker", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problemRouter)
