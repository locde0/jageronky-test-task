from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class JurisdictionService:

    async def resolve_county(
        self,
        db: AsyncSession,
        latitude: float,
        longitude: float,
    ) -> str | None:

        query = text("""
            SELECT name
            FROM geo_boundaries
            WHERE type = 'county'
              AND st_contains(
                    geom,
                    st_setsrid(st_makepoint(:lon, :lat), 4326)
                  )
            limit 1
        """)

        result = await db.execute(
            query,
            {"lat": latitude, "lon": longitude}
        )

        row = result.fetchone()
        return row[0] if row else None
