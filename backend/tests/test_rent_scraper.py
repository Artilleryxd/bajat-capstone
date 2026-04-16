import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.rent_scraper import get_rent_estimate


def test_rent_scraper_kharghar_dependents_3() -> None:
    result = asyncio.run(get_rent_estimate(location="Kharghar", dependents=3))

    assert result["recommended_bhk"] == "2BHK"
    assert isinstance(result["avg_rent"], int)
    assert isinstance(result["min_rent"], int)
    assert isinstance(result["max_rent"], int)
    assert result["min_rent"] > 0
    assert result["min_rent"] <= result["avg_rent"] <= result["max_rent"]


if __name__ == "__main__":
    print(asyncio.run(get_rent_estimate(location="Kharghar", dependents=3)))