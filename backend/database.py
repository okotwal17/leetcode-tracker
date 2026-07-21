import os
from dotenv import load_dotenv
from pymongo import AsyncMongoClient

load_dotenv()
client = AsyncMongoClient(os.getenv("MONGODB_URL"))
db = client["leetcode_tracker"]
problems = db["problems"]
