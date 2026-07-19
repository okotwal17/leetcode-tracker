from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import client
from problemRoutes import problemRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield                      # startup happens above this line
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
