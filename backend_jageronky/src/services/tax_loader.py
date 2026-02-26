import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "tax_rates.json"


def load_tax_data():
    with open(DATA_PATH, "r") as f:
        return json.load(f)
