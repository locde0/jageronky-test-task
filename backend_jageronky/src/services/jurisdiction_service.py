from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class JurisdictionService:

    @staticmethod
    async def resolve(
        db: AsyncSession,
        latitude: float,
        longitude: float,
    ) -> tuple[str, str] | None:

        query = text("""
            SELECT 
                MAX(name) FILTER (WHERE type = 'county') AS county_name,
                MAX(name) FILTER (WHERE type = 'city') AS city_name
            FROM geo_boundaries
            WHERE 
                type IN ('county', 'city')
                AND st_covers(
                    geom,
                    st_setsrid(st_makepoint(:lon, :lat), 4326)
                )
        """)

        result = await db.execute(
            query,
            {"lat": latitude, "lon": longitude}
        )

        row = result.fetchone()
        if row and (row.county_name or row.city_name):
            return row.county_name, row.city_name

        return None
