from fastapi import APIRouter, UploadFile

router = APIRouter()


@router.post("/orders/import")
async def import_orders(
        file: UploadFile,
):
    pass


@router.get("/orders")
async def get_orders():
    pass


@router.post("/orders")
async def add_orders():
    pass