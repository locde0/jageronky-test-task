# services/order_service.py

from services.jurisdiction_service import JurisdictionService
from services.tax_service import TaxService

class OrderService:

    def __init__(self):
        self.jurisdiction = JurisdictionService()

    def process_order(self, lat, lon, subtotal):

        county = self.jurisdiction.resolve_county(lat, lon)

        if not county:
            raise ValueError("Outside NY")

        composite, tax, total = TaxService.calculate(subtotal, county)

        return county, composite, tax, total