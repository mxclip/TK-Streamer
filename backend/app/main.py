from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.db import create_db_and_tables
from app.api.routes import auth, csv_upload, bags, phrase_map, match, feedback, analytics, scripts, phrase_mappings
from app.services.websocket_manager import websocket_endpoint
from app.middleware.security import RateLimitMiddleware, InputValidationMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="TikTok Luxury Resale Livestream Helper API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add security middleware
app.add_middleware(RateLimitMiddleware, calls=100, period=60)  # 100 calls per minute
app.add_middleware(InputValidationMiddleware)


@app.on_event("startup")
def on_startup():
    """Initialize database and create tables on startup."""
    create_db_and_tables()
    logger.info("Database tables created successfully")


# Health check endpoint
@app.get("/")
def read_root():
    return {
        "message": "TikTok Streamer Backend API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
        "websocket": "/ws/render"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "tiktok-streamer-backend"}


# WebSocket endpoint for real-time script streaming
@app.websocket("/ws/render")
async def websocket_render_endpoint(websocket: WebSocket, bag_id: int = None):
    """
    WebSocket endpoint for teleprompter real-time script streaming.
    
    Query Parameters:
    - bag_id: Optional bag ID to subscribe to specific bag updates
    
    Message Format:
    {
        "type": "subscribe|unsubscribe|ping|script_used",
        "data": {...}
    }
    """
    connection_id = f"teleprompter_{id(websocket)}"
    if bag_id:
        connection_id += f"_bag_{bag_id}"
    
    await websocket_endpoint(websocket, connection_id)


# Include API routes
app.include_router(
    auth.router,
    prefix=settings.API_V1_STR + "/auth",
    tags=["authentication"]
)

app.include_router(
    csv_upload.router,
    prefix=settings.API_V1_STR,
    tags=["csv-import"]
)

app.include_router(
    bags.router,
    prefix=settings.API_V1_STR,
    tags=["bags"]
)

app.include_router(
    phrase_map.router,
    prefix=settings.API_V1_STR,
    tags=["phrase-mapping"]
)

app.include_router(
    phrase_mappings.router,
    prefix=settings.API_V1_STR,
    tags=["phrase-mappings-v2"]
)

app.include_router(
    match.router,
    prefix=settings.API_V1_STR,
    tags=["product-matching"]
)

app.include_router(
    feedback.router,
    prefix=settings.API_V1_STR,
    tags=["feedback-analytics"]
)

app.include_router(
    analytics.router,
    prefix=settings.API_V1_STR,
    tags=["analytics"]
)

app.include_router(
    scripts.router,
    prefix=settings.API_V1_STR,
    tags=["scripts"]
)




# Additional endpoints for extension integration
@app.get(f"{settings.API_V1_STR}/status")
def get_api_status():
    """Get API status and configuration for extension."""
    return {
        "api_version": "1.0.0",
        "websocket_url": f"ws://{settings.WS_HOST}/ws/render",
        "endpoints": {
            "match": f"{settings.API_V1_STR}/match",
            "feedback": f"{settings.API_V1_STR}/feedback"
        },
        "features": {
            "phrase_mapping": True,
            "real_time_websocket": True,
            "csv_import": True,
            "analytics": True
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 