"""Configuration settings for Signal Clone backend application."""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""

    PROJECT_NAME: str = "Signal Messenger Clone"
    API_V1_STR: str = ""
    SECRET_KEY: str = os.getenv("JWT_SECRET", "super-secret-signal-clone-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    FIXED_OTP: str = os.getenv("FIXED_OTP", "123456")

    # SQLite async connection string
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./signal_clone.db")

    # CORS origins allowed
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ]

    class Config:
        case_sensitive = True


settings = Settings()
