from fastapi import APIRouter, UploadFile, Depends, File, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.tax_config import TaxConfig
from src.db.session import get_db
from src.core.deps import get_tax_config
from src.schemas import OrderCreate, OrderOut, OrdersQuery, OrdersListOut
from src.services.list_orders import ListOrdersService
from src.services.create_orders import CreateOrderService
from src.services.import_orders import ImportService

router = APIRouter()


@router.post("/import")
async def import_orders(
        file: UploadFile = File(...),
        tax_config: TaxConfig = Depends(get_tax_config),
        db: AsyncSession = Depends(get_db)
):
    content = await file.read()

    service = ImportService(db, tax_config)

    return await service.import_orders(
        file_name=file.filename,
        file_bytes=content,
    )

@router.post("", response_model=OrderOut)
async def create_orders(
        dto: OrderCreate,
        tax_config: TaxConfig = Depends(get_tax_config),
        db: AsyncSession = Depends(get_db)
):
    service = CreateOrderService(db, tax_config)
    return await service.create_order(dto)


@router.get("", response_model=OrdersListOut)
async def get_orders(
        query: OrdersQuery = Depends(),
        db: AsyncSession = Depends(get_db)
):
    service = ListOrdersService(db)

    items, total = await service.list_orders(limit=query.limit, offset=query.offset)
    return OrdersListOut(items=items, total=total, limit=query.limit, offset=query.offset)
