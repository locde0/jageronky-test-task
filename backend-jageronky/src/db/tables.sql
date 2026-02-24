create table orders(
    id serial primary key,
    latitude double precision not null check (-90 <= latitude and latitude <= 90),
    longitude double precision not null check (-180 <= longitude and latitude <= 180),
    subtotal numeric(12,2) not null check (subtotal >= 0),
    timestamp timestamptz not null
);