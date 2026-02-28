from fastapi import Request

from src.core.tax_config import TaxConfig


def get_tax_config(request: Request) -> TaxConfig:
    return request.app.state.tax_config
