"""Main FastAPI application factory and entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_auth, routes_conversations, routes_groups, routes_users, routes_ws
from app.core.config import settings
from app.db.base import Base, engine, AsyncSessionLocal
from app.db.seed import seed_database_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events for the application."""
    # Ensure all tables are created on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Automatically seed database if empty
    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    yield
    # Clean up database connection on shutdown
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

    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API routers
    app.include_router(routes_auth.router)
    app.include_router(routes_users.router)
    app.include_router(routes_conversations.router)
    app.include_router(routes_conversations.messages_router)
    app.include_router(routes_groups.router)
    app.include_router(routes_ws.router)

    @app.get("/api/health")
    async def health_check() -> dict[str, str]:
        """Provide a simple health check endpoint for monitoring."""
        return {"status": "ok", "app": settings.PROJECT_NAME}

    return app


app = create_app()
