import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CVF-QA Analytics Engine", version="0.1.0")

ANALYTICS_CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("ANALYTICS_CORS_ORIGINS", "http://localhost:3001,http://localhost:3000").split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ANALYTICS_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/health")
def health(): return {"status": "ok", "engine": "analytics"}
