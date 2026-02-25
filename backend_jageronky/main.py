from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.routers.orders import router as orders_router
from src.services.tax_loader import load_tax_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("startup logic here")
    app.state.tax_data = load_tax_data()

    yield

    print("shutdown logic here")


app = FastAPI(lifespan=lifespan)


app.include_router(orders_router, prefix="/orders")


@app.get("/")
async def root():
    return {"message": "jageronky uoy!"}
