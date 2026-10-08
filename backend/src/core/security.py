from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from typing import Optional

# Setup passlib
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

import os
from src.core.config import settings

# Secret key — load from env or settings. Fallback is >= 32 bytes for HS256 (RFC 7518).
SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    settings.SECRET_KEY
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
