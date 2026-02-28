import json
from decimal import Decimal, ROUND_HALF_UP

from src.core.tax_config import TaxConfig


class TaxCalculationService:

    def __init__(self, tax_config: TaxConfig):
        self._tax_config = tax_config

    def build_order_tax_record(
        self,
        order_id: int,
        subtotal: Decimal,
        county: str | None,
        city: str | None,
    ) -> tuple:
        if county is None:
            return self._build_failed_record(
                order_id=order_id,
                county=None,
                city=city,
                error_text='point is outside NY jurisdiction boundaries',
            )

        county_data = self._tax_config.get_county(county)
        if county_data is None:
            return self._build_failed_record(
                order_id=order_id,
                county=county,
                city=city,
                error_text=f'{county} not found in tax config',
            )

        state_rate = Decimal(str(self._tax_config.state_rate))
        county_rate = Decimal('0')
        city_rate = Decimal('0')
        special_rates: list[float] = []

        city_exception = None
        if city:
            city_exception = self._tax_config.get_city_exception(city)

        if city_exception:
            city_rate = Decimal(str(city_exception['city_rate']))
        else:
            county_rate = Decimal(str(county_data['county_rate']))

        if self._tax_config.is_mctd_county(county):
            mctd_rate = Decimal(str(self._tax_config.mctd_rate))
            special_rates.append(float(mctd_rate))
        else:
            mctd_rate = Decimal('0')

        composite_tax_rate = state_rate + county_rate + city_rate + mctd_rate
        tax_amount = (subtotal * composite_tax_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_amount = (subtotal + tax_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        jurisdictions = {
            'state': 'NY',
            'county': county,
            'city': city,
            'special': ['MCTD'] if mctd_rate > 0 else [],
        }

        return (
            order_id,
            'calculated',
            float(composite_tax_rate),
            float(tax_amount),
            float(total_amount),
            float(state_rate),
            float(county_rate),
            float(city_rate),
            json.dumps(special_rates),
            json.dumps(jurisdictions),
            None,
        )

    @staticmethod
    def _build_failed_record(
        order_id: int,
        county: str | None,
        city: str | None,
        error_text: str,
    ) -> tuple:
        jurisdictions = {
            'state': None,
            'county': county,
            'city': city,
            'special': [],
        }

        return (
            order_id,
            'failed',
            None,
            None,
            None,
            None,
            None,
            None,
            json.dumps([]),
            json.dumps(jurisdictions),
            error_text,
        )
