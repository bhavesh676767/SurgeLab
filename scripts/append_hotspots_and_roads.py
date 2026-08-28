"""Append reported hotspots and fetch Gurugram road network for risk painting."""

from __future__ import annotations

import csv
import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "dataset"
PUBLIC_DATA = ROOT / "public" / "data"

NEW_HOTSPOTS = [
    {
        "incident_id": "INC_0167",
        "latitude": 28.3930,
        "longitude": 77.0640,
        "location_name": "Sector 67 — AIPL Joy Street / Main Dividing Road",
        "sector": "Sector 67",
        "date": "2025-08-14",
        "time": "15:00",
        "severity": 3,
        "depth_cm": 42.0,
        "duration_minutes": 180,
        "elevation_m": 214.5,
        "underpass": 0,
        "hotspot": 1,
        "rain_intensity": 58.0,
        "wetness": 10.4,
        "drain_m": 95.0,
    },
    {
        "incident_id": "INC_0168",
        "latitude": 28.3820,
        "longitude": 77.0520,
        "location_name": "Sector 66 — Bestech Side toward Sohna Road",
        "sector": "Sector 66",
        "date": "2025-08-14",
        "time": "15:15",
        "severity": 3,
        "depth_cm": 48.0,
        "duration_minutes": 200,
        "elevation_m": 213.8,
        "underpass": 0,
        "hotspot": 1,
        "rain_intensity": 62.0,
        "wetness": 10.8,
        "drain_m": 88.0,
    },
    {
        "incident_id": "INC_0169",
        "latitude": 28.361118,
        "longitude": 77.078915,
        "location_name": "Maruti Kunj Main Gate",
        "sector": "Maruti Kunj / Bhondsi",
        "date": "2025-08-14",
        "time": "14:30",
        "severity": 4,
        "depth_cm": 65.0,
        "duration_minutes": 280,
        "elevation_m": 209.2,
        "underpass": 0,
        "hotspot": 1,
        "rain_intensity": 70.0,
        "wetness": 11.6,
        "drain_m": 140.0,
    },
    {
        "incident_id": "INC_0170",
        "latitude": 28.3595,
        "longitude": 77.0765,
        "location_name": "Sneh Vihar near Dadi Sati Mandir",
        "sector": "Ward 19 / Maruti Kunj",
        "date": "2025-08-14",
        "time": "14:45",
        "severity": 3,
        "depth_cm": 50.0,
        "duration_minutes": 210,
        "elevation_m": 210.5,
        "underpass": 0,
        "hotspot": 1,
        "rain_intensity": 55.0,
        "wetness": 11.0,
        "drain_m": 110.0,
    },
    {
        "incident_id": "INC_0171",
        "latitude": 28.3475,
        "longitude": 77.0810,
        "location_name": "Bhondsi Government School Area",
        "sector": "Bhondsi",
        "date": "2025-08-14",
        "time": "15:00",
        "severity": 3,
        "depth_cm": 52.0,
        "duration_minutes": 220,
        "elevation_m": 210.8,
        "underpass": 0,
        "hotspot": 1,
        "rain_intensity": 60.0,
        "wetness": 11.2,
        "drain_m": 125.0,
    },
    {
        "incident_id": "INC_0172",
        "latitude": 28.4180,
        "longitude": 77.0380,
        "location_name": "Sohna Road — Airia Mall Corridor",
        "sector": "Sohna Road / Sector 47",
        "date": "2025-08-14",
        "time": "16:00",
        "severity": 4,
        "depth_cm": 55.0,
        "duration_minutes": 240,
        "elevation_m": 212.0,
        "underpass": 0,
        "hotspot": 1,
        "rain_intensity": 68.0,
        "wetness": 10.6,
        "drain_m": 75.0,
    },
    {
        "incident_id": "INC_0173",
        "latitude": 28.3720,
        "longitude": 77.0630,
        "location_name": "Sector 69/70 Waterlogging Belt",
        "sector": "Sector 69 / 70",
        "date": "2025-08-14",
        "time": "16:15",
        "severity": 3,
        "depth_cm": 46.0,
        "duration_minutes": 190,
        "elevation_m": 213.5,
        "underpass": 0,
        "hotspot": 1,
        "rain_intensity": 56.0,
        "wetness": 10.3,
        "drain_m": 82.0,
    },
]

SOURCE = "Citizen Field Report / MCG Hotspot Document"
SOURCE_URL = "user_observation_mcg"


def read_csv_rows(path: Path) -> tuple[list[str], list[list[str]]]:
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    return rows[0], rows[1:]


def write_csv_rows(path: Path, header: list[str], rows: list[list[str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


def append_incidents() -> int:
    path = DATASET / "waterlogging_incidents.csv"
    header, rows = read_csv_rows(path)
    existing = {r[0] for r in rows}
    added = 0
    for h in NEW_HOTSPOTS:
        if h["incident_id"] in existing:
            continue
        rows.append(
            [
                h["incident_id"],
                str(h["latitude"]),
                str(h["longitude"]),
                h["location_name"],
                h["sector"],
                h["date"],
                h["time"],
                str(h["severity"]),
                str(h["depth_cm"]),
                str(h["duration_minutes"]),
                SOURCE,
                SOURCE_URL,
                "1",
            ]
        )
        added += 1
    write_csv_rows(path, header, rows)
    return added


def rainfall_bundle(intensity: float) -> tuple[float, float, float, float]:
    return (
        intensity,
        round(intensity * 1.8, 1),
        round(intensity * 2.4, 1),
        round(intensity * 3.2, 1),
    )


def append_ml_and_training() -> tuple[int, int]:
    ml_path = DATASET / "gurugram_waterlogging_ml.csv"
    tr_path = DATASET / "gurugram_waterlogging_training.csv"
    ml_header, ml_rows = read_csv_rows(ml_path)
    tr_header, tr_rows = read_csv_rows(tr_path)
    ml_existing = {r[0] for r in ml_rows}
    tr_existing = {r[0] for r in tr_rows}
    ml_added = tr_added = 0

    for i, h in enumerate(NEW_HOTSPOTS):
        rid = f"GWL_{701 + i:04d}"
        sev = min(h["severity"], 4)
        wl = 1 if sev > 0 else 0
        r1, r3, r6, r24 = rainfall_bundle(h["rain_intensity"])

        if rid not in ml_existing:
            ml_rows.append(
                [
                    rid,
                    str(h["latitude"]),
                    str(h["longitude"]),
                    str(h["elevation_m"]),
                    "1.5",
                    str(h["wetness"]),
                    "450.0",
                    str(h["drain_m"]),
                    str(h["underpass"]),
                    "12",
                    str(h["hotspot"]),
                    str(r1),
                    str(r3),
                    str(r6),
                    str(r24),
                    str(h["rain_intensity"]),
                    str(wl),
                    str(sev),
                ]
            )
            ml_added += 1

        if rid not in tr_existing:
            tr_rows.append(
                [
                    rid,
                    str(h["latitude"]),
                    str(h["longitude"]),
                    h["location_name"],
                    h["sector"],
                    "Gurugram",
                    h["date"],
                    h["time"],
                    SOURCE,
                    "citizen_report",
                    SOURCE_URL,
                    "high",
                    str(r1),
                    str(r3),
                    str(r6),
                    str(r24),
                    str(h["rain_intensity"]),
                    "EVT_20250814",
                    str(h["elevation_m"]),
                    "1.5",
                    str(h["wetness"]),
                    "450.0",
                    "MCG Drain Network",
                    str(h["drain_m"]),
                    "Sector Road",
                    str(h["underpass"]),
                    "12",
                    str(h["hotspot"]),
                    str(wl),
                    str(sev),
                    str(h["depth_cm"]),
                    str(h["duration_minutes"]),
                    "1" if sev >= 4 else "0",
                    str(min(sev, 3)),
                    "0",
                ]
            )
            tr_added += 1

    write_csv_rows(ml_path, ml_header, ml_rows)
    write_csv_rows(tr_path, tr_header, tr_rows)
    return ml_added, tr_added


def overpass_query(query: str) -> dict:
    endpoints = [
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]
    last_err: Exception | None = None
    for base in endpoints:
        url = base + "?data=" + urllib.parse.quote(query)
        req = urllib.request.Request(url, headers={"User-Agent": "SurgeLab/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            last_err = e
            print(f"    endpoint {base} failed ({e})")
            time.sleep(2)
    raise last_err or RuntimeError("All Overpass endpoints failed")


def fetch_roads_geojson() -> int:
    """Fetch roads in smaller chunks by highway class."""
    bbox = "28.34,77.02,28.50,77.13"
    highway_types = [
        "primary",
        "secondary",
        "tertiary",
        "residential",
        "unclassified",
        "service",
        "living_street",
    ]
    all_features: list[dict] = []
    seen_ids: set[int] = set()

    for hw in highway_types:
        query = f'[out:json][timeout:90];way["highway"="{hw}"]({bbox});out geom;'
        try:
            data = overpass_query(query)
            for el in data.get("elements", []):
                if el.get("type") != "way" or el.get("id") in seen_ids:
                    continue
                geom = el.get("geometry")
                if not geom or len(geom) < 2:
                    continue
                seen_ids.add(el["id"])
                all_features.append(
                    {
                        "type": "Feature",
                        "properties": {
                            "id": el["id"],
                            "highway": el.get("tags", {}).get("highway", hw),
                            "name": el.get("tags", {}).get("name", ""),
                        },
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[p["lon"], p["lat"]] for p in geom],
                        },
                    }
                )
            print(f"  {hw}: {len(data.get('elements', []))} ways")
            time.sleep(1)
        except Exception as e:
            print(f"  {hw}: failed ({e})")

    if not all_features:
        fallback = PUBLIC_DATA / "gurugram_corridors.geojson"
        if fallback.is_file():
            out = PUBLIC_DATA / "gurugram_roads.geojson"
            out.write_text(fallback.read_text(encoding="utf-8"), encoding="utf-8")
            data = json.loads(out.read_text(encoding="utf-8"))
            print(f"  Overpass unavailable — copied fallback corridors ({len(data.get('features', []))} features)")
            return len(data.get("features", []))
        raise RuntimeError("No road features fetched from Overpass and no fallback file")

    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    out = PUBLIC_DATA / "gurugram_roads.geojson"
    with out.open("w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": all_features}, f)
    return len(all_features)


def main() -> None:
    inc = append_incidents()
    ml, tr = append_ml_and_training()
    print(f"Appended {inc} incidents, {ml} ML rows, {tr} training rows")
    print("Fetching road network...")
    road_count = fetch_roads_geojson()
    print(f"Saved {road_count} road segments to public/data/gurugram_roads.geojson")


if __name__ == "__main__":
    main()
