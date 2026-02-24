insert into geo_counties(county_name, geom)
select
    trim("NAME") as county_name,
    st_multi(st_makevalid(geom)) as geom
from geo_counties_raw;

drop table geo_counties_raw;

insert into geo_cities(city_name, county_name, geom)
select
  trim("NAME") as city_name,
  trim("COUNTY") as county_name,
  st_multi(st_makevalid(geom)) as geom
from geo_cities_raw;

drop table geo_cities_raw;


-- test
select count(*) from geo_counties;
select st_srid(geom), count(*) from geo_counties group by 1;


select county_name
from geo_counties
where st_covers(geom, st_setsrid(st_makepoint(-73.9857, 40.7484), 4326))
limit 1;



select city_name, county_name
from geo_cities
where st_covers(geom, st_setsrid(st_makepoint(-73.9857, 40.7484), 4326))
limit 5;