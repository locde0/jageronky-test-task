# jageronky-test-task - NY Tax Calculation System

## Overview

This project calculates New York sales tax for orders using:
- state tax rate,
- county tax rate,
- city-level exceptions,
- special district tax rules such as MCTD,
- geospatial jurisdiction resolution based on latitude and longitude.

The system supports:
- single order tax calculation,
- bulk CSV import,
- audit-friendly tax breakdown storage,
- local reproducibility with Docker.

---

## Tech Stack

### Backend
- **FastAPI**
- **PostgreSQL + PostGIS**
- **SQLAlchemy (async)**

### Frontend
- **React + TypeScript**
- **Vite**

### Infrastructure
- **Docker + Docker Compose**

---

## How It Works

1. Orders are saved with latitude, longitude, subtotal, and timestamp.
2. PostGIS is used to determine the matching county and city boundaries.
3. Tax rates are resolved using a local tax configuration file.
4. For city exceptions, the city tax rate is used and the county rate is set to `0`.
5. If there is no city exception, the county tax rate is used and the city rate is set to `0`.
6. State tax is always added.
7. If the county is in the MCTD list, the additional MCTD rate is added.
8. Full tax breakdown and jurisdiction metadata are stored in the database.

---

## Data Sources

### 1. NYS Civil Boundaries
Boundary geometries are based on the official **NYS GIS Clearinghouse Civil Boundaries** dataset.

Official source:
- NYS GIS Civil Boundaries page: `https://gis.ny.gov/civil-boundaries`
- NYS GIS dataset page: `https://data.gis.ny.gov/datasets/sharegisny::nys-civil-boundaries`

These files are used to determine county and city jurisdictions from coordinates.

### 2. NYS Sales Tax Rates
Tax rates and reporting codes are based on official **New York State Department of Taxation and Finance** publications.

Primary source:
- Publication 718: `https://www.tax.ny.gov/pdf/publications/sales/pub718.pdf`

Reference pages:
- Sales tax rate publications: `https://www.tax.ny.gov/pubs_and_bulls/tg_bulletins/st/sales_tax_rate_publications.htm`

---

# How to Run the Project Locally

## Requirements

- Docker
- Docker Compose

Check installation:

```bash
docker --version
docker compose version
```

---

## Start the Full Stack

From the project root:

```bash
docker compose up --build
```

After startup:

- **Backend API** -> `http://localhost:8000`
- **Swagger / OpenAPI** -> `http://localhost:8000/docs`
- **Frontend** -> `http://localhost:3000`
- **PostgreSQL** -> `localhost:5432`

---

## What Docker Starts

The Docker setup is intended to start the full local environment:

- `db` - PostgreSQL with PostGIS
- `db-seed` - initializes schema and loads geospatial boundary data
- `backend` - FastAPI application
- `frontend` - React application

The `db-seed` service is responsible for:
1. applying `schema.sql`,
2. importing boundary shapefiles into raw tables,
3. running `transform_boundaries.sql` to populate the final boundary tables used by the application.

---

## Environment Variables

Typical environment variables used by the backend and Docker setup:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jageronky
DB_USER=postgres
DB_PASSWORD=postgres
```

Inside Docker Compose, the backend usually connects to the database service by container name, for example `db`.

If the backend is run outside Docker, `DB_HOST=localhost` is typically used.

---

## Bulk Import Flow

For CSV imports, the system:
1. validates rows,
2. inserts orders,
3. resolves city/county jurisdictions,
4. calculates tax records,
5. stores tax calculation results in `order_taxes`.

Records that cannot be calculated should still be represented in tax results with a failed status and an error message, rather than being silently dropped.

---

## Technical Decisions

### Geospatial Jurisdiction Resolution (PostGIS)

We store county and city boundaries as geometries in PostgreSQL and use spatial queries (`ST_Covers`) to determine where an order belongs.

### Optimized Bulk Import

For CSV imports, PostgreSQL `COPY` is used instead of row-by-row inserts.

### Tax Configuration

Tax rules are loaded from a dedicated JSON configuration and include:
- state rate,
- county rates,
- city exceptions,
- MCTD counties.

This keeps tax logic deterministic and easy to review.
