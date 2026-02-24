from decimal import Decimal

STATE_RATE = Decimal("0.04")

COUNTY_RATES = {
    "Kings": Decimal("0.045"),
    "New York": Decimal("0.045"),
    "Queens": Decimal("0.045"),
}

class TaxService:

    @staticmethod
    def calculate(subtotal, county):

        subtotal = Decimal(str(subtotal))

        county_rate = COUNTY_RATES.get(county, Decimal("0.0"))

        composite = STATE_RATE + county_rate

        tax = subtotal * composite
        total = subtotal + tax

        return composite, tax.quantize(Decimal("0.01")), total.quantize(Decimal("0.01"))