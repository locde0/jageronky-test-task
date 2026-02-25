from pydantic import BaseModel, Field
import datetime as dt


class OrderBase(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    subtotal: float = Field(..., ge=0)
    timestamp: dt.datetime = Field(..., description="ISO datetime, e.g. 2026-02-23T10:15:00Z")


class OrderCreate(OrderBase):
    pass


class TaxBreakdown(BaseModel):
    state_rate: float = Field(..., ge=0, description="decimal rate, e.g. 0.05")
    county_rate: float = Field(..., ge=0)
    city_rate: float = Field(..., ge=0)
    special_rates: list[float] = Field(default_factory=list, description="extra rates as decimals")


class Jurisdictions(BaseModel):
    state: str | None = None
    county: str | None = None
    city: str | None = None
    special: list[str] = Field(default_factory=list)


class OrderOut(OrderBase):
    id: int = Field(..., description="order id")

    composite_tax_rate: float = Field(..., ge=0, description="total tax rate, e.g. 0.08875")
    tax_amount: float = Field(..., ge=0)
    total_amount: float = Field(..., ge=0)

    breakdown: TaxBreakdown
    jurisdictions: Jurisdictions | None = None


class OrdersQuery(BaseModel):
    limit: int = Field(20, ge=1, le=200)
    offset: int = Field(0, ge=0)

    date_from: dt.datetime | None = None
    date_to: dt.datetime | None = None

    min_subtotal: float | None = Field(None, ge=0)
    max_subtotal: float | None = Field(None, ge=0)


class OrdersListOut(BaseModel):
    items: list[OrderOut]
    total: int
    limit: int
    offset: int
