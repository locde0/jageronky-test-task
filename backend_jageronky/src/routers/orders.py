import csv
from _datetime import datetime
import io
import hashlib
from decimal import Decimal

from fastapi import APIRouter, UploadFile, Depends, File, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.tax_config import TaxConfig
from src.db.session import get_db
from src.core.deps import get_tax_config
from src.schemas import OrderCreate, OrderOut, OrdersQuery, OrdersListOut
from src.services.jurisdiction_service import JurisdictionService
from src.services.orders import create_order, list_orders
from src.services.tax_calculator import TaxCalculationService
from src.services.import_orders import ImportService

router = APIRouter()


@router.post("/import")
async def import_orders(
        file: UploadFile = File(...),
        tax_config: TaxConfig = Depends(get_tax_config),
        db: AsyncSession = Depends(get_db)
):
        content = await file.read()

        return await ImportService.import_orders(
            tax_config=tax_config,
            db=db,
            file_name=file.filename,
            file_bytes=content,
        )

@router.post("", response_model=OrderOut)
async def create_orders(
        dto: OrderCreate,
        tax_config: TaxConfig = Depends(get_tax_config),
        db: AsyncSession = Depends(get_db)
):
    return await create_order(tax_config, db, dto)


@router.get("", response_model=OrdersListOut)
async def get_orders(
        query: OrdersQuery = Depends(),
        db: AsyncSession = Depends(get_db)
):
    items, total = await list_orders(db=db, limit=query.limit, offset=query.offset)
    return OrdersListOut(items=items, total=total, limit=query.limit, offset=query.offset)
