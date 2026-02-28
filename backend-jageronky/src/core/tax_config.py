import json
from pathlib import Path


class TaxConfig:
    def __init__(self, path: str):
        self._path = path
        self._data = self._load()

        self._state_rate = float(self._data["consts"]["state_rate"])
        self._mctd_rate = float(self._data["consts"]["mctd_rate"])
        self._mctd_counties = set(self._data["mctd_counties"])
        self._counties = self._data["counties"]
        self._cities_exceptions = self._data["cities_exceptions"]

    def _load(self):
        with open(Path(self._path), "r") as f:
            return json.load(f)

    @property
    def state_rate(self) -> float:
        return self._state_rate

    @property
    def mctd_rate(self) -> float:
        return self._mctd_rate

    def get_county(self, name: str) -> dict | None:
        return self._counties.get(name)

    def is_mctd_county(self, name: str) -> bool:
        return name in self._mctd_counties

    def get_city_exception(self, name: str) -> dict | None:
        return self._cities_exceptions.get(name)
