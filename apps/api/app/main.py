from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .config import get_settings
from .database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="votosdosenado API",
    description="Dados oficiais, métricas reproduzíveis e camadas editoriais explicitamente separadas.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/")
def root():
    return {"name": "votosdosenado", "docs": "/docs", "health": "/api/v1/health"}
