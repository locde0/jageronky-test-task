insert into geo_boundaries(name, type, geom)
select
    trim("NAME") as name,
    'county' as type,
    st_multi(st_makevalid(geom)) as geom
from geo_counties_raw;

drop table geo_counties_raw;

insert into geo_boundaries(name, type, geom)
select
    trim("NAME") as name,
    'city' as type,
    st_multi(st_makevalid(geom)) as geom
from geo_cities_raw;

drop table geo_cities_raw;
