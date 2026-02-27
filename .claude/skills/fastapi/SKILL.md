---
model: claude-sonnet-4-6
name: fastapi
description: Use when working with FastAPI endpoints, Pydantic v2 models, dependency injection, middleware, background tasks, WebSockets, or streaming responses. Also use when testing FastAPI with httpx/TestClient, deploying with uvicorn, or debugging async route handling and OpenAPI schema generation.
---

# fastapi

## Overview

FastAPI is an async-first Python web framework built on Starlette and Pydantic v2. It auto-generates OpenAPI (Swagger) docs from type annotations. Pydantic v1 support is deprecated — use Pydantic v2 patterns throughout.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Quick Reference

| Pattern | Usage |
|---------|-------|
| Path operation | `@router.get("/path", response_model=Schema)` |
| Route params | `async def view(id: int, slug: str)` — matched from path |
| Query params | `async def view(page: int = 1, limit: int = 20)` |
| Request body | `async def view(data: MySchema)` — Pydantic model |
| Dependency | `Depends(get_db)` / `Depends(get_current_user)` |
| Auth gate | Custom `Depends` that raises `HTTPException(401)` |
| JSON error | `raise HTTPException(status_code=404, detail="Not found")` |
| Streaming | `StreamingResponse(generator(), media_type="text/event-stream")` |
| File upload | `file: UploadFile = File(...)` |
| Background task | `background_tasks: BackgroundTasks` → `background_tasks.add_task(fn, arg)` |
| WebSocket | `@router.websocket("/ws")` → `async with websocket` |
| Response model | `response_model=List[ItemSchema]` — auto-serializes and validates |
| Include router | `app.include_router(router, prefix="/api/v1", tags=["items"])` |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Application Setup

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    await database.connect()
    yield
    # shutdown
    await database.disconnect()

app = FastAPI(
    title="My API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from apps.items import router as items_router
from apps.auth import router as auth_router

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(items_router, prefix="/api/v1/items", tags=["items"])
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Pydantic v2 Models

```python
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from datetime import datetime
from typing import Optional

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    price: float = Field(..., gt=0)
    description: Optional[str] = Field(None, max_length=1000)
    tags: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def check_price_description(self) -> "ItemCreate":
        if self.price > 1000 and not self.description:
            raise ValueError("High-price items require a description")
        return self

# ORM response model — Pydantic v2 syntax (replaces orm_mode=True)
class ItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: float
    created_at: datetime
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Path Operations

```python
from fastapi import APIRouter, HTTPException, status, Query, Path

router = APIRouter()

@router.get("/", response_model=list[ItemResponse])
async def list_items(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    items = await item_service.list(db, offset=offset, limit=limit, search=search)
    return items

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
):
    item = await item_service.get(db, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: ItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await item_service.create(db, data=data, owner_id=current_user.id)

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = await item_service.delete(db, item_id=item_id, owner_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Dependency Injection

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

# Database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Auth — token extraction
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    user = await auth_service.verify_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user

# Composable — reuse as chain
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Shared query params — class-based dependency
class PaginationParams:
    def __init__(self, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit

@router.get("/")
async def list_items(pagination: PaginationParams = Depends()):
    ...
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)  # always await call_next
        duration = time.monotonic() - start
        response.headers["X-Process-Time"] = f"{duration:.3f}"
        return response

app.add_middleware(TimingMiddleware)
# Order: last added = outermost (first to intercept requests)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Streaming Responses and SSE

```python
from fastapi.responses import StreamingResponse
import asyncio

async def token_generator(prompt: str):
    """Simulate LLM token streaming."""
    words = ["Hello", " from", " streaming", " FastAPI"]
    for word in words:
        yield f"data: {word}\n\n"
        await asyncio.sleep(0.1)
    yield "data: [DONE]\n\n"

@router.post("/stream")
async def stream_response(request: StreamRequest):
    return StreamingResponse(
        token_generator(request.prompt),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## WebSockets

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: str):
        for connection in self.active:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"{client_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Background Tasks

```python
from fastapi import BackgroundTasks

async def send_welcome_email(user_email: str, name: str):
    # email logic here
    pass

@router.post("/register", status_code=201)
async def register(
    data: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.create(db, data)
    # Fire after response is sent — client doesn't wait
    background_tasks.add_task(send_welcome_email, user.email, user.name)
    return user
```

⚠ `BackgroundTasks` are tied to the request lifecycle. For long-running work (>30s), use a task queue (Celery, ARQ, or Dramatiq).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## File Uploads

```python
from fastapi import UploadFile, File
import aiofiles

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Only JPEG/PNG/WebP images allowed")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(413, "File too large")

    filename = f"{current_user.id}/{file.filename}"
    async with aiofiles.open(f"uploads/{filename}", "wb") as f:
        await f.write(contents)

    return {"filename": filename, "size": len(contents)}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Testing

```python
# tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def auth_client(client):
    response = await client.post("/auth/token", json={"username": "test", "password": "pass"})
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client

# tests/test_items.py
@pytest.mark.asyncio
async def test_create_item(auth_client):
    response = await auth_client.post("/api/v1/items/", json={"name": "Widget", "price": 9.99})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Widget"

@pytest.mark.asyncio
async def test_get_item_not_found(auth_client):
    response = await auth_client.get("/api/v1/items/99999")
    assert response.status_code == 404
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Deployment (uvicorn)

```bash
# Dev
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production — multiple workers via Gunicorn
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or: uvicorn with workers (single process, multiple workers)
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
```

```dockerfile
# Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `class Config: orm_mode = True` | Pydantic v2: `model_config = ConfigDict(from_attributes=True)` |
| Sync DB calls inside `async def` | Use async driver (asyncpg, aiomysql) or `asyncio.to_thread()` |
| `BackgroundTasks` for long-running jobs | Use Celery/ARQ/Dramatiq for work >30s |
| Raising `HTTPException` inside BackgroundTasks | Client already responded — exception is swallowed; use logging |
| Returning SQLAlchemy model directly | Always return Pydantic model or `.model_dump()` — ORM objects aren't JSON-serializable |
| Multiple `Depends` referencing same resource | FastAPI caches Depends per request — same instance returned (correct behavior) |
| Missing `await` in async handlers | Sync functions run in threadpool and block the event loop for I/O |
| Middleware not awaiting `call_next` | Always `response = await call_next(request)` — never skip |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Sources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FastAPI Release Notes](https://fastapi.tiangolo.com/release-notes/)
- [Pydantic v2 Docs](https://docs.pydantic.dev/latest/)
- [Pydantic v2 Migration Guide](https://docs.pydantic.dev/latest/migration/)
- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [Starlette Middleware](https://www.starlette.io/middleware/)
