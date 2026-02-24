from fastapi import APIRouter, UploadFile, Depends, File
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db
from src.schemas import OrderCreate, OrderOut, OrdersQuery, OrdersListOut

router = APIRouter()


@router.post("/import")
async def import_orders(
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db)
):
    pass


@router.post("", response_model=OrderOut)
async def create_orders(
        dto: OrderCreate,
        db: AsyncSession = Depends(get_db)
):
    pass


@router.get("", response_model=OrdersListOut)
async def get_orders(
        query: OrdersQuery = Depends(),
        db: AsyncSession = Depends(get_db)
):
    return OrdersListOut(items=[], total=0, limit=0, offset=0)
