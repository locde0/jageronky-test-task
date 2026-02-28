FROM postgis/postgis:16-3.4

RUN apt-get update && apt-get install -y \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /seed

COPY backend-jageronky/data/db/schema.sql /seed/schema.sql
COPY backend-jageronky/data/db/transform_boundaries.sql /seed/transform_boundaries.sql
COPY backend-jageronky/data/boundaries /seed/boundaries
COPY docker/db-seed/init-db.sh /seed/init-db.sh

RUN chmod +x /seed/init-db.sh

ENTRYPOINT ["/seed/init-db.sh"]