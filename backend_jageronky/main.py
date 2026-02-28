from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from src.routers.orders import router as orders_router
from src.core.tax_config import TaxConfig


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("startup logic here")
    app.state.tax_config = TaxConfig("data/tax_rates.json")

    yield

    print("shutdown logic here")


app = FastAPI(lifespan=lifespan)


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    return JSONResponse(
        status_code=503,
        content={"detail": "Service temporarily unavailable (e.g. database not running).", "error": str(exc)},
        headers=CORS_HEADERS,
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for local development; on production specify specific domains
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders_router, prefix="/orders")


@app.get("/")
async def root():
    return {"message": "jageronky uoy!"}
