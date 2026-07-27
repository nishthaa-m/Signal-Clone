"""Main FastAPI application factory and entry point."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (
    routes_auth,
    routes_conversations,
    routes_groups,
    routes_uploads,
    routes_users,
    routes_ws,
)
from app.core.config import settings
from app.db.base import AsyncSessionLocal, Base, engine
from app.db.seed import seed_database_if_empty

# Uploads directory fallback for cloud hosting (Railway)
UPLOADS_DIR = os.getenv(
    "UPLOADS_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/public/uploads"))
)
os.makedirs(UPLOADS_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events for the application."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    yield
    await engine.dispose()


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application instance."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount static files for uploads
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

    # Mount API routers
    app.include_router(routes_auth.router)
    app.include_router(routes_users.router)
    app.include_router(routes_conversations.router)
    app.include_router(routes_conversations.messages_router)
    app.include_router(routes_groups.router)
    app.include_router(routes_uploads.router)
    app.include_router(routes_ws.router)

    @app.get("/api/health")
    async def health_check() -> dict[str, str]:
        """Provide a simple health check endpoint for monitoring."""
        return {"status": "ok", "app": settings.PROJECT_NAME}

    return app


app = create_app()
