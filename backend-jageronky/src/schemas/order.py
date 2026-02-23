from pydantic import BaseModel, Field
import datetime as dt


class CreateOrder(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    subtotal: float = Field(..., ge=0)
    timestamp: dt.datetime = Field(..., description="iso datetime, e.g. 2026-02-23T10:15:00Z")
