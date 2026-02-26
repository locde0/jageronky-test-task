from fastapi import APIRouter, UploadFile, Depends, File, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db
from src.schemas import OrderCreate, OrderOut, OrdersQuery, OrdersListOut
from src.services.jurisdiction_service import JurisdictionService
from src.services.orders import create_order, list_orders

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
        request: Request,
        db: AsyncSession = Depends(get_db)
):
    tax_data = request.app.state.tax_data
    return await create_order(db, dto, tax_data)


@router.get("", response_model=OrdersListOut)
async def get_orders(
        query: OrdersQuery = Depends(),
        db: AsyncSession = Depends(get_db)
):
    items, total = await list_orders(db=db, limit=query.limit, offset=query.offset)
    return OrdersListOut(items=items, total=total, limit=query.limit, offset=query.offset)
