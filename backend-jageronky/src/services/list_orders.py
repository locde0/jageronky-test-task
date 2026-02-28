from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ListOrdersService:

    def __init__(self, db: AsyncSession):
        self._db = db

    async def list_orders(
        self,
        limit: int,
        offset: int,
    ) -> tuple[list, int]:
        total = await self._count_orders()
        items = await self._fetch_orders(limit=limit, offset=offset)
        return items, total

    async def _count_orders(self) -> int:
        result = await self._db.execute(
            text('''
                SELECT COUNT(*)
                FROM orders o
                JOIN order_taxes t ON t.order_id = o.id
                    AND t.status = 'calculated'
            ''')
        )
        return result.scalar_one()

    async def _fetch_orders(
        self,
        limit: int,
        offset: int,
    ) -> list[dict]:
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
                JOIN order_taxes t ON t.order_id = o.id
                    AND t.status = 'calculated'
                ORDER BY o.id DESC
                LIMIT :limit OFFSET :offset
            '''),
            {
                'limit': limit,
                'offset': offset,
            },
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
            })

        return items
