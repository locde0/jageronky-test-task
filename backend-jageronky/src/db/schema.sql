create extension if not exists postgis;


create type order_source as enum ('manual', 'import');
create type tax_calc_status as enum ('calculated', 'review', 'failed');


create table imports(
    id bigserial primary key,

    file_name text not null,
    file_sha256 text not null unique,
    imported_dt timestamptz not null default now(),

    total_rows bigint not null default 0 check (total_rows >= 0),
    inserted_rows bigint not null default 0 check (inserted_rows >= 0),
    failed_rows bigint not null default 0 check (failed_rows >= 0)
);

create table orders(
    id bigserial primary key,

    source order_source not null,
    import_id bigint null references imports(id) on delete set null,
    source_order_id bigint null unique,

    latitude double precision not null check (-90 <= latitude and latitude <= 90),
    longitude double precision not null check (-180 <= longitude and longitude <= 180),
    delivery_geom geometry(Point, 4326) generated always as (
        st_setsrid(st_makepoint(longitude, latitude), 4326)
    ) stored,

    subtotal numeric(12,2) not null check (subtotal >= 0),
    ordered_dt timestamptz not null,
    created_dt timestamptz not null default now(),

    check (
        (source = 'import' and import_id is not null) or (source = 'manual' and import_id is null)
    ),
    check (
        (source = 'import' and source_order_id is not null) or (source = 'manual' and source_order_id is null)
    )
);

create index idx_orders_ordered_dt on orders(ordered_dt);
create index idx_orders_subtotal on orders(subtotal);
create index idx_orders_source on orders(source);
create index idx_orders_import_id on orders(import_id);
create index idx_orders_ordered_dt_id on orders(ordered_dt desc, id desc);
create index idx_orders_delivery_geom on orders using gist (delivery_geom);


create table geo_counties(
    id bigserial primary key,

    county_name text not null unique,
    geom geometry(MultiPolygon, 4326) not null
);

create index idx_geo_counties_geom on geo_counties using gist (geom);


create table geo_cities(
    id bigserial primary key,

    city_name text not null,
    county_name text null,
    geom geometry(MultiPolygon, 4326) not null
);

create index idx_geo_cities_geom on geo_cities using gist (geom);
create index idx_geo_cities_name on geo_cities(city_name);
create index idx_geo_cities_county_name on geo_cities(county_name);


create table mctd_counties(
    county_name text primary key
);


create table order_taxes(
    id bigserial primary key,

    order_id bigint not null unique references orders(id) on delete cascade,
    status tax_calc_status not null default 'review',

    composite_tax_rate numeric(9,6) null check (composite_tax_rate >= 0),

    tax_amount numeric(12,2) null check (tax_amount >= 0),
    total_amount numeric(12,2) null check (total_amount >= 0),

    state_rate numeric(9,6) null check (state_rate >= 0),
    county_rate numeric(9,6) null check (county_rate >= 0),
    city_rate numeric(9,6) null check (city_rate >= 0),

    -- [{"code":"MCTD","rate":0.00375}]
    special_rates jsonb not null default '[]'::jsonb,

    -- {"state":{"code":"NY"},"county":{"name":"Kings"},"city":{"name":"New York"},"special":[{"code":"MCTD"}]}
    jurisdictions jsonb not null,

    calculated_dt timestamptz not null default now(),
    error_text text null,

    check (
        status != 'calculated'
        or (
            composite_tax_rate is not null
            and state_rate is not null
            and county_rate is not null
            and city_rate is not null
            and tax_amount is not null
            and total_amount is not null
            and error_text is null
        )
    ),
    check (status != 'failed' or error_text is not null)
);

create index idx_order_taxes_status on order_taxes(status);
create index idx_order_taxes_calculated_dt on order_taxes(calculated_dt);
create index idx_order_taxes_jurisdictions_gin on order_taxes using gin (jurisdictions);
