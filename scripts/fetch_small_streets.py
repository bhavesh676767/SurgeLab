"""Fetch internal/residential streets and merge into gurugram_roads.geojson."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "gurugram_roads.geojson"

TILES = [
    "28.34,77.02,28.42,77.075",
    "28.34,77.075,28.42,77.13",
    "28.42,77.02,28.50,77.075",
    "28.42,77.075,28.50,77.13",
]

ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]


def overpass(query: str) -> dict:
    last: Exception | None = None
    for base in ENDPOINTS:
        url = base + "?data=" + urllib.parse.quote(query)
        req = urllib.request.Request(url, headers={"User-Agent": "SurgeLab/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=240) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            last = e
            print(f"    {base}: {e}")
            time.sleep(4)
    raise last or RuntimeError("Overpass failed")


def load_existing() -> tuple[list[dict], set[int]]:
    if not OUT.is_file():
        return [], set()
    data = json.loads(OUT.read_text(encoding="utf-8"))
    features = data.get("features", [])
    ids = {f["properties"]["id"] for f in features if "id" in f.get("properties", {})}
    return features, ids


def main() -> None:
    features, seen = load_existing()
    print(f"Existing: {len(features)} ways")

    query_template = (
        "[out:json][timeout:180];("
        "way[\"highway\"=\"tertiary\"]({bbox});"
        "way[\"highway\"=\"residential\"]({bbox});"
        "way[\"highway\"=\"unclassified\"]({bbox});"
        "way[\"highway\"=\"service\"]({bbox});"
        "way[\"highway\"=\"living_street\"]({bbox});"
        ");out geom;"
    )

    added = 0
    for tile in TILES:
        query = query_template.format(bbox=tile)
        try:
            data = overpass(query)
            tile_added = 0
            for el in data.get("elements", []):
                if el.get("type") != "way":
                    continue
                wid = el["id"]
                if wid in seen:
                    continue
                geom = el.get("geometry")
                if not geom or len(geom) < 2:
                    continue
                seen.add(wid)
                features.append(
                    {
                        "type": "Feature",
                        "properties": {
                            "id": wid,
                            "highway": el.get("tags", {}).get("highway", "residential"),
                            "name": el.get("tags", {}).get("name", ""),
                        },
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[p["lon"], p["lat"]] for p in geom],
                        },
                    }
                )
                tile_added += 1
            added += tile_added
            print(f"  tile {tile}: +{tile_added}")
            time.sleep(3)
        except Exception as e:
            print(f"  tile {tile}: FAILED ({e})")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)

    hw_counts: dict[str, int] = {}
    for f in features:
        h = f["properties"].get("highway", "?")
        hw_counts[h] = hw_counts.get(h, 0) + 1

    print(f"Done: {len(features)} total (+{added} new)")
    for h, n in sorted(hw_counts.items(), key=lambda x: -x[1]):
        print(f"  {h}: {n}")


if __name__ == "__main__":
    main()
