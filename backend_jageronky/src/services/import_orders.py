import csv
import io
import hashlib
import json
from datetime import datetime
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ImportService:

    def __init__(self, tax_data: dict):
        self.tax_data = tax_data

    async def import_orders(
        self,
        db: AsyncSession,
        file_name: str,
        file_bytes: bytes,
    ):
        try:
            decoded = file_bytes.decode("utf-8")
            file_hash = hashlib.sha256(file_bytes).hexdigest()

            # ---- Duplicate check ----
            existing = await db.execute(
                text("SELECT id FROM imports WHERE file_sha256 = :hash"),
                {"hash": file_hash},
            )

            if existing.scalar():
                return {"error": "File already imported"}

            # ---- Create import record ----
            result = await db.execute(
                text("""
                    INSERT INTO imports (file_name, file_sha256)
                    VALUES (:file_name, :file_sha256)
                    RETURNING id
                """),
                {
                    "file_name": file_name,
                    "file_sha256": file_hash,
                },
            )

            import_id = result.scalar_one()

            # ---- Parse CSV ----
            reader = csv.DictReader(io.StringIO(decoded))
            rows = list(reader)

            total = len(rows)
            order_records = []

            for row in rows:
                try:
                    ordered_dt = datetime.fromisoformat(row["timestamp"][:26])

                    order_records.append((
                        'import',
                        import_id,
                        int(row["id"]),
                        float(row["latitude"]),
                        float(row["longitude"]),
                        float(row["subtotal"]),
                        ordered_dt
                    ))
                except Exception:
                    continue

            inserted = len(order_records)
            failed = total - inserted

            # ---- COPY orders ----
            conn = await db.connection()
            raw = await conn.get_raw_connection()
            pg_conn = raw.driver_connection

            if order_records:
                await pg_conn.copy_records_to_table(
                    'orders',
                    records=order_records,
                    columns=[
                        'source',
                        'import_id',
                        'source_order_id',
                        'latitude',
                        'longitude',
                        'subtotal',
                        'ordered_dt'
                    ]
                )

            # ---- Spatial join (get county name only) ----
            result = await db.execute(text("""
                SELECT o.id,
                       o.subtotal,
                       c.name AS county_name
                FROM orders o
                JOIN geo_boundaries c
                  ON c.type = 'county'
                 AND ST_Contains(c.geom, o.delivery_geom)
                WHERE o.import_id = :import_id
            """), {"import_id": import_id})

            orders = result.mappings().all()

            state_rate = Decimal(str(self.tax_data["consts"]["state_rate"]))
            mctd_rate = Decimal(str(self.tax_data["consts"]["mctd_rate"]))
            mctd_counties = set(self.tax_data["mctd_counties"])

            tax_records = []

            for row in orders:
                county = row["county_name"]
                subtotal = Decimal(str(row["subtotal"]))

                county_data = self.tax_data["counties"].get(county)

                # ---- FAILED case ----
                if not county_data:
                    tax_records.append((
                        row["id"],
                        'failed',
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        json.dumps([]),
                        json.dumps({
                            "state": None,
                            "county": None,
                            "city": None
                        }),
                        f"County '{county}' not found in tax_data"
                    ))
                    continue

                county_rate = Decimal(str(county_data["county_rate"]))
                extra = mctd_rate if county in mctd_counties else Decimal("0")

                composite = state_rate + county_rate + extra
                tax_amount = (subtotal * composite).quantize(Decimal("0.01"))
                total_amount = subtotal + tax_amount

                tax_records.append((
                    row["id"],
                    'calculated',
                    float(composite),
                    float(tax_amount),
                    float(total_amount),
                    float(state_rate),
                    float(county_rate),
                    0.0,
                    json.dumps([float(extra)] if extra > 0 else []),
                    json.dumps({
                        "state": "NY",
                        "county": county,
                        "city": None
                    }),
                    None
                ))

            # ---- COPY order_taxes ----
            if tax_records:
                await pg_conn.copy_records_to_table(
                    'order_taxes',
                    records=tax_records,
                    columns=[
                        'order_id',
                        'status',
                        'composite_tax_rate',
                        'tax_amount',
                        'total_amount',
                        'state_rate',
                        'county_rate',
                        'city_rate',
                        'special_rates',
                        'jurisdictions',
                        'error_text'
                    ]
                )

            # ---- Update import stats ----
            await db.execute(
                text("""
                    UPDATE imports
                    SET total_rows = :total,
                        inserted_rows = :inserted,
                        failed_rows = :failed
                    WHERE id = :import_id
                """),
                {
                    "total": total,
                    "inserted": inserted,
                    "failed": failed,
                    "import_id": import_id,
                },
            )

            await db.commit()

            return {
                "import_id": import_id,
                "total": total,
                "inserted": inserted,
                "failed": failed,
            }

        except Exception:
            await db.rollback()
            raise