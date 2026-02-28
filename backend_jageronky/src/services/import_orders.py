import csv
import hashlib
import io
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.tax_config import TaxConfig
from src.services.tax_calculation import TaxCalculationService
from src.services.jurisdiction import JurisdictionService


@dataclass(slots=True)
class ParsedOrderRow:
    source_order_id: int
    latitude: float
    longitude: float
    subtotal: Decimal
    ordered_dt: datetime


@dataclass(slots=True)
class ParseSummary:
    total_rows: int
    valid_rows: list[ParsedOrderRow]
    failed_rows: int


class ImportService:

    def __init__(self, db: AsyncSession, tax_config: TaxConfig):
        self._db = db
        self._tax_config = tax_config
        self._tax_service = TaxCalculationService(tax_config)

    async def import_orders(
        self,
        file_name: str,
        file_bytes: bytes,
    ) -> dict:
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        existing_id = await self._find_existing_import(file_hash)
        if existing_id is not None:
            return {'message': 'file already imported'}

        parsed = self._parse_csv(file_bytes)

        import_id = await self._create_import_record(
            file_name=file_name,
            file_hash=file_hash,
        )

        if parsed.valid_rows:
            await self._bulk_insert_orders(
                import_id=import_id,
                rows=parsed.valid_rows,
            )

        orders_with_jurisdictions = await JurisdictionService.resolve_for_import(
            db=self._db,
            import_id=import_id,
        )

        tax_records = [
            self._tax_service.build_order_tax_record(
                order_id=row['id'],
                subtotal=Decimal(str(row['subtotal'])),
                county=row['county_name'],
                city=row['city_name'],
            )
            for row in orders_with_jurisdictions
        ]

        if tax_records:
            await self._bulk_insert_order_taxes(records=tax_records)

        await self._update_import_stats(
            import_id=import_id,
            total_rows=parsed.total_rows,
            inserted_rows=len(parsed.valid_rows),
            failed_rows=parsed.failed_rows,
        )

        taxes_calculated = sum(1 for record in tax_records if record[1] == 'calculated')
        taxes_failed = sum(1 for record in tax_records if record[1] == 'failed')

        return {
            'status': 'success',
            'import_id': import_id,
            'total_rows': parsed.total_rows,
            'inserted_rows': len(parsed.valid_rows),
            'failed_rows': parsed.failed_rows,
            'taxes_created': len(tax_records),
            'taxes_calculated': taxes_calculated,
            'taxes_failed': taxes_failed,
        }

    async def _find_existing_import(self, file_hash: str) -> int | None:
        result = await self._db.execute(
            text('''SELECT id FROM imports WHERE file_sha256 = :hash'''),
            {'hash': file_hash},
        )
        return result.scalar_one_or_none()

    async def _create_import_record(self, file_name: str, file_hash: str) -> int:
        result = await self._db.execute(
            text('''
                INSERT INTO imports (file_name, file_sha256)
                VALUES (:file_name, :file_hash)
                RETURNING id
            '''),
            {
                'file_name': file_name,
                'file_hash': file_hash,
            },
        )
        await self._db.commit()
        return result.scalar_one()

    @staticmethod
    def _parse_csv(file_bytes: bytes) -> ParseSummary:
        decoded = file_bytes.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))

        valid_rows: list[ParsedOrderRow] = []
        total_rows = 0

        for raw_row in reader:
            total_rows += 1

            try:
                parsed = ParsedOrderRow(
                    source_order_id=int(raw_row['id']),
                    latitude=float(raw_row['latitude']),
                    longitude=float(raw_row['longitude']),
                    subtotal=Decimal(str(raw_row['subtotal'])),
                    ordered_dt=datetime.fromisoformat(raw_row['timestamp'].replace('Z', '+00:00')),
                )
                valid_rows.append(parsed)
            except Exception:
                continue

        return ParseSummary(
            total_rows=total_rows,
            valid_rows=valid_rows,
            failed_rows=total_rows - len(valid_rows),
        )

    async def _bulk_insert_orders(self, import_id: int, rows: list[ParsedOrderRow]) -> None:
        records = [
            (
                'import',
                import_id,
                row.source_order_id,
                row.latitude,
                row.longitude,
                row.subtotal,
                row.ordered_dt,
            )
            for row in rows
        ]

        conn = await self._db.connection()
        raw_conn = await conn.get_raw_connection()
        pg_conn = raw_conn.driver_connection

        await pg_conn.copy_records_to_table(
            'orders',
            records=records,
            columns=[
                'source',
                'import_id',
                'source_order_id',
                'latitude',
                'longitude',
                'subtotal',
                'ordered_dt',
            ],
        )

    async def _fetch_inserted_orders(self, import_id: int):
        result = await self._db.execute(
            text('''
                 SELECT id,
                        latitude,
                        longitude,
                        subtotal
                 FROM orders
                 WHERE import_id = :import_id
                 ORDER BY id
                 '''),
            {'import_id': import_id},
        )
        return result.mappings().all()

    async def _bulk_insert_order_taxes(
        self,
        records: list[tuple],
    ) -> None:
        conn = await self._db.connection()
        raw_conn = await conn.get_raw_connection()
        pg_conn = raw_conn.driver_connection

        await pg_conn.copy_records_to_table(
            'order_taxes',
            records=records,
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
            ],
        )

    async def _update_import_stats(
        self,
        import_id: int,
        total_rows: int,
        inserted_rows: int,
        failed_rows: int,
    ) -> None:
        await self._db.execute(
            text('''
                UPDATE imports
                SET total_rows = :total_rows,
                    inserted_rows = :inserted_rows,
                    failed_rows = :failed_rows
                WHERE id = :import_id
            '''),
            {
                'import_id': import_id,
                'total_rows': total_rows,
                'inserted_rows': inserted_rows,
                'failed_rows': failed_rows,
            },
        )
