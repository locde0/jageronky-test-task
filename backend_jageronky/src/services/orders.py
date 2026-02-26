from sqlalchemy import text
from src.services.tax_calculator import TaxCalculationService
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.orders import OrderCreate


async def create_order(db: AsyncSession, dto: OrderCreate, tax_data: dict):

    result = await db.execute(
        text("""
            INSERT INTO orders (
               source,
                latitude,
                longitude,
                subtotal,
                ordered_dt
            )
            VALUES (
                'manual',
                :latitude,
                :longitude,
                :subtotal,
                :ordered_dt
            )
            RETURNING id
        """),
        {
            "latitude": dto.latitude,
            "longitude": dto.longitude,
            "subtotal": dto.subtotal,
            "ordered_dt": dto.timestamp,
        },
    )

    order_id = result.scalar_one()

    tax_service = TaxCalculationService(tax_data)

    await tax_service.calculate_for_order(
        db=db,
        order_id=order_id,
        latitude=dto.latitude,
        longitude=dto.longitude,
        subtotal=dto.subtotal,
   )
    await db.commit()

    check = await db.execute(
        text("SELECT * FROM order_taxes WHERE order_id = :id"),
        {"id": order_id}
    )

    result = await db.execute(
        text("""
             SELECT o.id,
                    o.latitude,
                    o.longitude,
                    o.subtotal,
                    o.ordered_dt AS timestamp,
                t.composite_tax_rate,
                t.tax_amount,
                t.total_amount,
                t.state_rate,
                t.county_rate,
                t.city_rate,
                t.special_rates,
                t.jurisdictions
             FROM orders o
                 JOIN order_taxes t
             ON t.order_id = o.id
             WHERE o.id = :order_id
             """),
        {"order_id": order_id},
    )

    row = result.mappings().first()
    if not row:
        raise Exception("Tax calculation record not found")

    return {
        "id": row["id"],
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        "subtotal": row["subtotal"],
        "timestamp": row["timestamp"],
        "composite_tax_rate": float(row["composite_tax_rate"]),
        "tax_amount": float(row["tax_amount"]),
        "total_amount": float(row["total_amount"]),
        "breakdown": {
            "state_rate": float(row["state_rate"]),
            "county_rate": float(row["county_rate"]),
            "city_rate": float(row["city_rate"]),
            "special_rates": row["special_rates"],
        },
        "jurisdictions": row["jurisdictions"],
    }


async def list_orders(
    db: AsyncSession,
    limit: int,
    offset: int,
):
    total_result = await db.execute(
        text("SELECT COUNT(*) FROM orders")
    )
    total = total_result.scalar_one()

    result = await db.execute(
        text("""
            SELECT
                o.id,
                o.latitude,
                o.longitude,
                o.subtotal,
                o.ordered_dt AS timestamp,
                t.composite_tax_rate,
                t.tax_amount,
                t.total_amount,
                t.state_rate,
                t.county_rate,
                t.city_rate,
                t.special_rates,
                t.jurisdictions
            FROM orders o
            JOIN order_taxes t 
            ON t.order_id = o.id
            AND t.status = 'calculated'
            ORDER BY o.id DESC
            LIMIT :limit OFFSET :offset
        """),
        {"limit": limit, "offset": offset},
    )

    rows = result.mappings().all()

    items = []

    for row in rows:
        items.append({
            "id": row["id"],
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "subtotal": float(row["subtotal"]),
            "timestamp": row["timestamp"],
            "composite_tax_rate": float(row["composite_tax_rate"]),
            "tax_amount": float(row["tax_amount"]),
            "total_amount": float(row["total_amount"]),
            "breakdown": {
                "state_rate": float(row["state_rate"]),
                "county_rate": float(row["county_rate"]),
                "city_rate": float(row["city_rate"]),
                "special_rates": row["special_rates"] or []
            },
            "jurisdictions": row["jurisdictions"],
        })

    return items, total
