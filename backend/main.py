import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from backend.routers import analyze, meals, profile, stats, usage

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("calzy")

app = FastAPI(
    title="Calzy API",
    # Under /api/v1 so the docs are reachable through the same Vercel rewrite.
    docs_url="/api/v1/docs",
    redoc_url=None,
    openapi_url="/api/v1/openapi.json",
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


for r in (profile.router, meals.router, analyze.router, stats.router, usage.router):
    app.include_router(r, prefix="/api/v1")


@app.exception_handler(APIError)
def supabase_error(_: Request, exc: APIError) -> JSONResponse:
    # PostgREST rejects expired/invalid JWTs with PGRST30x; treat those as a login problem.
    if (exc.code or "").startswith("PGRST30"):
        return JSONResponse({"detail": "Invalid token"}, status_code=401)
    log.error("Supabase error %s: %s", exc.code, exc.message)
    return JSONResponse({"detail": "Database error"}, status_code=502)
