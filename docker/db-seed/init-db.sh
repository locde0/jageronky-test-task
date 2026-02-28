#!/usr/bin/env bash
set -euo pipefail

export PGPASSWORD="${POSTGRES_PASSWORD}"

echo "Waiting for Postgres..."
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"; do
  sleep 2
done

echo "Postgres is ready."

echo "Applying schema.sql..."
psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -f /seed/schema.sql

echo "Importing Counties shapefile..."
ogr2ogr -f PostgreSQL \
  "PG:host=${POSTGRES_HOST} port=${POSTGRES_PORT} dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}" \
  /seed/boundaries/Counties.shp \
  -nln geo_counties_raw \
  -lco GEOMETRY_NAME=geom \
  -lco LAUNDER=NO \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -select NAME \
  -overwrite

echo "Importing Cities shapefile..."
ogr2ogr -f PostgreSQL \
  "PG:host=${POSTGRES_HOST} port=${POSTGRES_PORT} dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}" \
  /seed/boundaries/Cities.shp \
  -nln geo_cities_raw \
  -lco GEOMETRY_NAME=geom \
  -lco LAUNDER=NO \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -select NAME,COUNTY \
  -overwrite

echo "Applying transform_boundaries.sql..."
psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -f /seed/transform_boundaries.sql

echo "DB seeding completed."