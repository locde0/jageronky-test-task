import json
from decimal import Decimal
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.jurisdiction_service import JurisdictionService


class TaxCalculationService:

    def __init__(self, tax_data: dict):
        self.tax_data = tax_data
        self.jurisdiction_service = JurisdictionService()

    async def calculate_for_order(
        self,
        db: AsyncSession,
        order_id: int,
        latitude: float,
        longitude: float,
        subtotal: Decimal,
    ):
        county = await self.jurisdiction_service.resolve_county(
            db, latitude, longitude
        )

        if not county:
            await self._fail(db, order_id, "County not found")
            return

        county_key = county

        if county == "New York":
            county_key = "New York City"

        county_data = self.tax_data["counties"].get(county_key)

        if not county_data:
            await self._fail(db, order_id, "County rate missing")
            return

        state_rate = Decimal(str(self.tax_data["consts"]["state_rate"]))
        county_rate = Decimal(str(county_data["county_rate"]))
        city_rate = Decimal("0")

        special_rates = []

        jurisdictions = {
            "state": "NY",
            "county": county_key,
            "city": None,
        }
        mctd_rate = Decimal("0")

        if county in self.tax_data["mctd_counties"]:
            mctd_rate = Decimal(str(self.tax_data["consts"]["mctd_rate"]))
            special_rates.append(float(mctd_rate))

        subtotal = Decimal(str(subtotal))

        composite_rate = state_rate + county_rate + city_rate + mctd_rate

        tax_amount = (subtotal * composite_rate).quantize(Decimal("0.01"))
        total_amount = subtotal + tax_amount

        await db.execute(
            text("""
                 INSERT INTO order_taxes (order_id,
                                          status,
                                          composite_tax_rate,
                                          tax_amount,
                                          total_amount,
                                          state_rate,
                                          county_rate,
                                          city_rate,
                                          special_rates,
                                          jurisdictions)
                 VALUES (:order_id,
                         'calculated',
                         :composite_tax_rate,
                         :tax_amount,
                         :total_amount,
                         :state_rate,
                         :county_rate,
                         :city_rate,
                         CAST(:special_rates AS jsonb),
                         CAST(:jurisdictions AS jsonb))
                 """),
            {
                "order_id": order_id,
                "composite_tax_rate": composite_rate,
                "tax_amount": tax_amount,
                "total_amount": total_amount,
                "state_rate": state_rate,
                "county_rate": county_rate,
                "city_rate": city_rate,
                "special_rates": json.dumps(special_rates),
                "jurisdictions": json.dumps(jurisdictions),
            },
        )



    async def _fail(self, db: AsyncSession, order_id: int, error: str):

        await db.execute(
            text("""
                INSERT INTO order_taxes (
                    order_id,
                    status,
                    error_text,
                    jurisdictions
                )
                VALUES (
                    :order_id,
                    'failed',
                    :error_text,
                    '{}'::jsonb
                )
            """),
            {
                "order_id": order_id,
                "error_text": error,
            },

        )
