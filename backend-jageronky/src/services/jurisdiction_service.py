from shapely.geometry import Point, shape
import json

class JurisdictionService:

    def __init__(self):
        with open("ny_counties.geojson") as f:
            self.geo_data = json.load(f)

    def resolve_county(self, lat, lon):
        point = Point(lon, lat)

        for feature in self.geo_data["features"]:
            polygon = shape(feature["geometry"])
            if point.within(polygon):
                return feature["properties"]["NAME"]

        return None