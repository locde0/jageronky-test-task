from fastapi import FastAPI
from src.routers.orders import router as orders_router


app = FastAPI()

app.include_router(orders_router, prefix="/orders")


@app.get("/")
async def root():
    return {"message": "jageronky uoy!"}
