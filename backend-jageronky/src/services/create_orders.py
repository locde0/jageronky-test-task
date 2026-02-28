from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.tax_config import TaxConfig
from src.schemas.orders import OrderCreate
from src.services.jurisdiction import JurisdictionService
from src.services.tax_calculation import TaxCalculationService


class CreateOrderService:

    def __init__(self, db: AsyncSession, tax_config: TaxConfig):
        self._db = db
        self._tax_config = tax_config
        self._tax_service = TaxCalculationService(tax_config)

    async def create_order(self, dto: OrderCreate) -> dict:
        order_id = await self._insert_order(dto)

        resolved = await JurisdictionService.resolve(
            db=self._db,
            latitude=dto.latitude,
            longitude=dto.longitude,
        )

        county, city = resolved if resolved is not None else (None, None)

        tax_record = self._tax_service.build_order_tax_record(
            order_id=order_id,
            subtotal=Decimal(str(dto.subtotal)),
            county=county,
            city=city,
        )

        await self._insert_order_tax(tax_record)

        result = await self._fetch_created_order(order_id)
        if result is not None:
            return result

        failed_row = await self._fetch_failed_tax(order_id)
        if failed_row is not None:
            raise HTTPException(
                status_code=422,
                detail=f'tax calculation failed: {failed_row["error_text"]}',
            )

        raise HTTPException(
            status_code=500,
            detail='tax calculation record missing',
        )

    async def _insert_order(self, dto: OrderCreate) -> int:
        result = await self._db.execute(
            text('''
                INSERT INTO orders (
                    source,
                    latitude,
                    longitude,
                    subtotal,
                    ordered_dt
                )
                VALUES (
                    'manual',
                    :latitude,
                    :longitude,
                    :subtotal,
                    :ordered_dt
                )
                RETURNING id
            '''),
            {
                'latitude': dto.latitude,
                'longitude': dto.longitude,
                'subtotal': dto.subtotal,
                'ordered_dt': dto.timestamp,
            },
        )
        return result.scalar_one()

    async def _insert_order_tax(self, tax_record: tuple) -> None:
        await self._db.execute(
            text('''
                INSERT INTO order_taxes (
                    order_id,
                    status,
                    composite_tax_rate,
                    tax_amount,
                    total_amount,
                    state_rate,
                    county_rate,
                    city_rate,
                    special_rates,
                    jurisdictions,
                    error_text
                )
                VALUES (
                    :order_id,
                    :status,
                    :composite_tax_rate,
                    :tax_amount,
                    :total_amount,
                    :state_rate,
                    :county_rate,
                    :city_rate,
                    CAST(:special_rates AS jsonb),
                    CAST(:jurisdictions AS jsonb),
                    :error_text
                )
            '''),
            {
                'order_id': tax_record[0],
                'status': tax_record[1],
                'composite_tax_rate': tax_record[2],
                'tax_amount': tax_record[3],
                'total_amount': tax_record[4],
                'state_rate': tax_record[5],
                'county_rate': tax_record[6],
                'city_rate': tax_record[7],
                'special_rates': tax_record[8],
                'jurisdictions': tax_record[9],
                'error_text': tax_record[10],
            },
        )

    async def _fetch_created_order(self, order_id: int) -> dict | None:
        result = await self._db.execute(
            text('''
                SELECT
                    o.id,
                    o.latitude,
                    o.longitude,
                    o.subtotal,
                    o.ordered_dt AS timestamp,
                    t.composite_tax_rate,
                    t.tax_amount,
                    t.total_amount,
                    t.state_rate,
                    t.county_rate,
                    t.city_rate,
                    t.special_rates,
                    t.jurisdictions
                FROM orders o
                JOIN order_taxes t
                  ON t.order_id = o.id
                 AND t.status = 'calculated'
                WHERE o.id = :order_id
            '''),
            {'order_id': order_id},
        )

        row = result.mappings().first()
        if row is None:
            return None

        return {
            'id': row['id'],
            'latitude': float(row['latitude']),
            'longitude': float(row['longitude']),
            'subtotal': float(row['subtotal']),
            'timestamp': row['timestamp'],
            'composite_tax_rate': float(row['composite_tax_rate']),
            'tax_amount': float(row['tax_amount']),
            'total_amount': float(row['total_amount']),
            'breakdown': {
                'state_rate': float(row['state_rate']),
                'county_rate': float(row['county_rate']),
                'city_rate': float(row['city_rate']),
                'special_rates': row['special_rates'] or [],
            },
            'jurisdictions': row['jurisdictions'],
        }

    async def _fetch_failed_tax(self, order_id: int) -> dict | None:
        result = await self._db.execute(
            text('''
                SELECT
                    status,
                    error_text
                FROM order_taxes
                WHERE order_id = :order_id
            '''),
            {'order_id': order_id},
        )
        return result.mappings().first()


async def list_orders(
    db: AsyncSession,
    limit: int,
    offset: int,
):
    total_result = await db.execute(
        text('''
            SELECT COUNT(*)
            FROM orders o
            JOIN order_taxes t
              ON t.order_id = o.id
             AND t.status = 'calculated'
        ''')
    )
    total = total_result.scalar_one()

    result = await db.execute(
        text('''
            SELECT
                o.id,
                o.latitude,
                o.longitude,
                o.subtotal,
                o.ordered_dt AS timestamp,
                t.composite_tax_rate,
                t.tax_amount,
                t.total_amount,
                t.state_rate,
                t.county_rate,
                t.city_rate,
                t.special_rates,
                t.jurisdictions
            FROM orders o
            JOIN order_taxes t ON t.order_id = o.id
                AND t.status = 'calculated'
            ORDER BY o.id DESC
            LIMIT :limit OFFSET :offset
        '''),
        {'limit': limit, 'offset': offset},
    )

    rows = result.mappings().all()

    items = []
    for row in rows:
        items.append({
            'id': row['id'],
            'latitude': float(row['latitude']),
            'longitude': float(row['longitude']),
            'subtotal': float(row['subtotal']),
            'timestamp': row['timestamp'],
            'composite_tax_rate': float(row['composite_tax_rate']) if row['composite_tax_rate'] is not None else None,
            'tax_amount': float(row['tax_amount']),
            'total_amount': float(row['total_amount']),
            'breakdown': {
                'state_rate': float(row['state_rate']),
                'county_rate': float(row['county_rate']),
                'city_rate': float(row['city_rate']),
                'special_rates': row['special_rates'] or [],
            },
            'jurisdictions': row['jurisdictions'],
        })

    return items, total
