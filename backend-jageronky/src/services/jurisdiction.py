from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class JurisdictionService:

    @staticmethod
    async def resolve(
        db: AsyncSession,
        latitude: float,
        longitude: float,
    ) -> tuple[str | None, str | None] | None:
        query = text('''
            SELECT 
                MAX(name) FILTER (WHERE type = 'county') AS county_name,
                MAX(name) FILTER (WHERE type = 'city') AS city_name
            FROM geo_boundaries
            WHERE 
                type IN ('county', 'city')
                AND ST_Covers(
                    geom,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
                )
        ''')

        result = await db.execute(
            query,
            {'lat': latitude, 'lon': longitude},
        )

        row = result.fetchone()
        if row and (row.county_name or row.city_name):
            return row.county_name, row.city_name

        return None

    @staticmethod
    async def resolve_for_import(
        db: AsyncSession,
        import_id: int,
    ):
        query = text('''
            SELECT
                o.id,
                o.subtotal,
                MAX(gb.name) FILTER (WHERE gb.type = 'county') AS county_name,
                MAX(gb.name) FILTER (WHERE gb.type = 'city') AS city_name
            FROM orders o
            LEFT JOIN geo_boundaries gb ON gb.type IN ('county', 'city')
                AND ST_Covers(gb.geom, ST_SetSRID(ST_MakePoint(o.longitude, o.latitude), 4326))
            WHERE o.import_id = :import_id
            GROUP BY o.id, o.subtotal
            ORDER BY o.id
        ''')

        result = await db.execute(query, {'import_id': import_id})
        return result.mappings().all()
