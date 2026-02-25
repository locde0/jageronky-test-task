import json
from pathlib import Path


class TaxConfigService:
    def __init__(self, path: str):
        self._data = self._load(path)

    def _load(self, path: str):
        with open(Path(path), "r") as f:
            return json.load(f)

    @property
    def state_rate(self) -> float:
        return self._data["consts"]["state_rate"]

    @property
    def mctd_rate(self) -> float:
        return self._data["consts"]["mctd_rate"]

    def get_county(self, name: str) -> dict | None:
        return self._data["counties"].get(name)

    def is_mctd_county(self, name: str) -> bool:
        return name in self._data["mctd_counties"]

    def get_city_exception(self, name: str) -> dict | None:
        return self._data["cities_exceptions"].get(name)
