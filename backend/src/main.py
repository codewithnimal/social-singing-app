from fastapi import FastAPI
from src.core.config import settings
from src.core.logging import setup_logging
from src.core.exceptions import add_exception_handlers
from fastapi.middleware.cors import CORSMiddleware
import logging

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only, update for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.api.routes import auth, friends, chat, users, effects

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(friends.router, prefix=f"{settings.API_V1_STR}/friends", tags=["friends"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(effects.router, prefix=f"{settings.API_V1_STR}/audio/effects", tags=["effects"])

@app.get("/health")
def health_check():
    logger.info("Health check requested")
    return {"status": "ok", "project": settings.PROJECT_NAME}

# API Router will be included here later
