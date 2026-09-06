"""
FastAPI application entrypoint.
Configures CORS, registers routers, initializes Gemini model.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ──────────────────────────────────────────────
# Global: Gemini model (shared across routers)
# ──────────────────────────────────────────────
gemini_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global gemini_model
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. "
            "Copy backend/.env.example to backend/.env and add your key."
        )
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel(
        model_name="gemini-3.6-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.1,       # Low temp for deterministic code generation
            max_output_tokens=4096,
        ),
    )
    print("✅ Gemini model initialized: gemini-3.6-flash")
    yield
    print("🛑 Shutting down AI Data Analyst backend.")


# ──────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────
app = FastAPI(
    title="AI Data Analyst",
    description="Self-correcting AI agent for natural-language data analysis.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────
from routers.upload import router as upload_router
from routers.analyze import router as analyze_router
from routers.export import router as export_router

app.include_router(upload_router, prefix="/api", tags=["Upload"])
app.include_router(analyze_router, prefix="/api", tags=["Analyze"])
app.include_router(export_router, prefix="/api", tags=["Export"])


@app.get("/health")
async def health():
    return {"status": "ok", "model": "gemini-2.0-flash"}
