# Vercel Python entry point. vercel.json rewrites /api/health and /api/v1/* here;
# FastAPI still sees the original request path.
from backend.main import app  # noqa: F401
