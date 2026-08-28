"""
Append citizen field observations to ./dataset/ CSVs and regenerate spatial grid coverage.
Run from project root: python src/data/append_user_experience.py
"""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / "dataset"

GRID_STEP = 0.005

NEW_INCIDENTS = [
    {
        "incident_id": "INC_0152",
        "latitude": 28.4789,
        "longitude": 77.0815,
        "location_name": "Sahara Mall / Chakkarpur Road",
        "sector": "Sector 28",
        "date": "2025-08-14",
        "time": "16:30",
        "severity": 2,
        "depth_cm": 30.0,
        "duration_minutes": 120,
    },
    {
        "incident_id": "INC_0153",
        "latitude": 28.4765,
        "longitude": 77.0790,
        "location_name": "Maruti Vihar & Housing Board",
        "sector": "Sector 28",
        "date": "2025-08-14",
        "time": "16:30",
        "severity": 2,
        "depth_cm": 35.0,
        "duration_minutes": 150,
    },
    {
        "incident_id": "INC_0154",
        "latitude": 28.4612,
        "longitude": 77.0821,
        "location_name": "Sushant Lok Police Station Stretch",
        "sector": "Sector 43",
        "date": "2025-08-14",
        "time": "17:00",
        "severity": 3,
        "depth_cm": 45.0,
        "duration_minutes": 180,
    },
    {
        "incident_id": "INC_0155",
        "latitude": 28.4895,
        "longitude": 77.0945,
        "location_name": "Nathupur Village Road",
        "sector": "Sector 24",
        "date": "2025-08-14",
        "time": "17:15",
        "severity": 4,
        "depth_cm": 60.0,
        "duration_minutes": 240,
    },
    {
        "incident_id": "INC_0156",
        "latitude": 28.4281,
        "longitude": 77.1190,
        "location_name": "Ghata Village Stretch",
        "sector": "Sector 55",
        "date": "2025-08-14",
        "time": "17:30",
        "severity": 3,
        "depth_cm": 55.0,
        "duration_minutes": 210,
    },
    {
        "incident_id": "INC_0157",
        "latitude": 28.4593,
        "longitude": 77.0725,
        "location_name": "Millennium City Centre Metro Area",
        "sector": "Sector 29",
        "date": "2025-08-14",
        "time": "16:00",
        "severity": 3,
        "depth_cm": 50.0,
        "duration_minutes": 200,
    },
    {
        "incident_id": "INC_0158",
        "latitude": 28.4542,
        "longitude": 77.0745,
        "location_name": "Fortis Hospital Perimeter Road",
        "sector": "Sector 44",
        "date": "2025-08-14",
        "time": "16:15",
        "severity": 2,
        "depth_cm": 40.0,
        "duration_minutes": 140,
    },
    {
        "incident_id": "INC_0159",
        "latitude": 28.4811,
        "longitude": 77.0512,
        "location_name": "Sukhrali Village Market Stretch",
        "sector": "Sector 17",
        "date": "2025-08-14",
        "time": "16:45",
        "severity": 3,
        "depth_cm": 45.0,
        "duration_minutes": 160,
    },
    {
        "incident_id": "INC_0160",
        "latitude": 28.4735,
        "longitude": 77.0450,
        "location_name": "Sector 14 Market Showrooms Frontage",
        "sector": "Sector 14",
        "date": "2025-08-14",
        "time": "16:50",
        "severity": 2,
        "depth_cm": 35.0,
        "duration_minutes": 130,
    },
    {
        "incident_id": "INC_0161",
        "latitude": 28.4632,
        "longitude": 77.0315,
        "location_name": "Sadar Bazar Market Lanes",
        "sector": "Sector 11 / Sadar",
        "date": "2025-08-14",
        "time": "17:00",
        "severity": 3,
        "depth_cm": 45.0,
        "duration_minutes": 190,
    },
    {
        "incident_id": "INC_0162",
        "latitude": 28.4856,
        "longitude": 77.0321,
        "location_name": "Sheetla Mata Mandir Road",
        "sector": "Sector 5",
        "date": "2025-08-14",
        "time": "17:10",
        "severity": 2,
        "depth_cm": 40.0,
        "duration_minutes": 150,
    },
    {
        "incident_id": "INC_0163",
        "latitude": 28.4680,
        "longitude": 77.0805,
        "location_name": "Sushant Lok 1 (Blocks A & B)",
        "sector": "Sushant Lok 1",
        "date": "2025-08-14",
        "time": "17:20",
        "severity": 2,
        "depth_cm": 40.0,
        "duration_minutes": 180,
    },
    {
        "incident_id": "INC_0164",
        "latitude": 28.4815,
        "longitude": 77.0910,
        "location_name": "Sikanderpur Village Main Road",
        "sector": "Sector 26",
        "date": "2025-08-14",
        "time": "17:30",
        "severity": 3,
        "depth_cm": 50.0,
        "duration_minutes": 220,
    },
    {
        "incident_id": "INC_0165",
        "latitude": 28.4685,
        "longitude": 77.0678,
        "location_name": "Leisure Valley Park Perimeter",
        "sector": "Sector 29",
        "date": "2025-08-14",
        "time": "18:00",
        "severity": 0,
        "depth_cm": 0.0,
        "duration_minutes": 0,
    },
    {
        "incident_id": "INC_0166",
        "latitude": 28.4720,
        "longitude": 77.0720,
        "location_name": "Major Arterial Underpass Corridor",
        "sector": "Sector 29 / 31",
        "date": "2025-08-14",
        "time": "16:30",
        "severity": 4,
        "depth_cm": 75.0,
        "duration_minutes": 300,
    },
]

# Terrain / ML features aligned with field notes
ML_FEATURES = [
    {
        "record_id": "GWL_0701",
        "elevation_m": 214.2,
        "road_slope_percent": 1.2,
        "topographic_wetness_index": 9.4,
        "distance_to_lowest_point_m": 420.0,
        "distance_to_nearest_drain_m": 85.0,
        "underpass": 0,
        "historical_waterlogging_count": 8,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 52.0,
    },
    {
        "record_id": "GWL_0702",
        "elevation_m": 213.8,
        "road_slope_percent": 0.9,
        "topographic_wetness_index": 9.8,
        "distance_to_lowest_point_m": 445.0,
        "distance_to_nearest_drain_m": 72.0,
        "underpass": 0,
        "historical_waterlogging_count": 7,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 48.0,
    },
    {
        "record_id": "GWL_0703",
        "elevation_m": 215.0,
        "road_slope_percent": 1.6,
        "topographic_wetness_index": 10.2,
        "distance_to_lowest_point_m": 380.0,
        "distance_to_nearest_drain_m": 95.0,
        "underpass": 0,
        "historical_waterlogging_count": 12,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 58.0,
    },
    {
        "record_id": "GWL_0704",
        "elevation_m": 212.5,
        "road_slope_percent": 2.1,
        "topographic_wetness_index": 11.5,
        "distance_to_lowest_point_m": 510.0,
        "distance_to_nearest_drain_m": 120.0,
        "underpass": 0,
        "historical_waterlogging_count": 15,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 72.0,
    },
    {
        "record_id": "GWL_0705",
        "elevation_m": 222.0,
        "road_slope_percent": 2.8,
        "topographic_wetness_index": 11.8,
        "distance_to_lowest_point_m": 620.0,
        "distance_to_nearest_drain_m": 180.0,
        "underpass": 0,
        "historical_waterlogging_count": 10,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 65.0,
    },
    {
        "record_id": "GWL_0706",
        "elevation_m": 214.5,
        "road_slope_percent": 1.4,
        "topographic_wetness_index": 10.5,
        "distance_to_lowest_point_m": 395.0,
        "distance_to_nearest_drain_m": 68.0,
        "underpass": 0,
        "historical_waterlogging_count": 14,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 60.0,
    },
    {
        "record_id": "GWL_0707",
        "elevation_m": 215.1,
        "road_slope_percent": 1.1,
        "topographic_wetness_index": 9.6,
        "distance_to_lowest_point_m": 410.0,
        "distance_to_nearest_drain_m": 55.0,
        "underpass": 0,
        "historical_waterlogging_count": 6,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 45.0,
    },
    {
        "record_id": "GWL_0708",
        "elevation_m": 213.1,
        "road_slope_percent": 1.8,
        "topographic_wetness_index": 10.8,
        "distance_to_lowest_point_m": 480.0,
        "distance_to_nearest_drain_m": 110.0,
        "underpass": 0,
        "historical_waterlogging_count": 11,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 55.0,
    },
    {
        "record_id": "GWL_0709",
        "elevation_m": 214.0,
        "road_slope_percent": 0.8,
        "topographic_wetness_index": 9.2,
        "distance_to_lowest_point_m": 430.0,
        "distance_to_nearest_drain_m": 78.0,
        "underpass": 0,
        "historical_waterlogging_count": 5,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 42.0,
    },
    {
        "record_id": "GWL_0710",
        "elevation_m": 212.8,
        "road_slope_percent": 1.5,
        "topographic_wetness_index": 10.1,
        "distance_to_lowest_point_m": 465.0,
        "distance_to_nearest_drain_m": 92.0,
        "underpass": 0,
        "historical_waterlogging_count": 9,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 50.0,
    },
    {
        "record_id": "GWL_0711",
        "elevation_m": 213.0,
        "road_slope_percent": 1.0,
        "topographic_wetness_index": 9.5,
        "distance_to_lowest_point_m": 440.0,
        "distance_to_nearest_drain_m": 88.0,
        "underpass": 0,
        "historical_waterlogging_count": 7,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 46.0,
    },
    {
        "record_id": "GWL_0712",
        "elevation_m": 215.5,
        "road_slope_percent": 0.7,
        "topographic_wetness_index": 9.1,
        "distance_to_lowest_point_m": 400.0,
        "distance_to_nearest_drain_m": 65.0,
        "underpass": 0,
        "historical_waterlogging_count": 8,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 44.0,
    },
    {
        "record_id": "GWL_0713",
        "elevation_m": 213.4,
        "road_slope_percent": 2.0,
        "topographic_wetness_index": 10.6,
        "distance_to_lowest_point_m": 490.0,
        "distance_to_nearest_drain_m": 105.0,
        "underpass": 0,
        "historical_waterlogging_count": 13,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 62.0,
    },
    {
        "record_id": "GWL_0714",
        "elevation_m": 217.5,
        "road_slope_percent": 0.4,
        "topographic_wetness_index": 7.5,
        "distance_to_lowest_point_m": 350.0,
        "distance_to_nearest_drain_m": 45.0,
        "underpass": 0,
        "historical_waterlogging_count": 0,
        "known_waterlogging_hotspot": 0,
        "rainfall_intensity_mm_hr": 12.0,
    },
    {
        "record_id": "GWL_0715",
        "elevation_m": 208.5,
        "road_slope_percent": 2.4,
        "topographic_wetness_index": 12.1,
        "distance_to_lowest_point_m": 280.0,
        "distance_to_nearest_drain_m": 320.0,
        "underpass": 1,
        "historical_waterlogging_count": 22,
        "known_waterlogging_hotspot": 1,
        "rainfall_intensity_mm_hr": 78.0,
    },
]

SOURCE = "Citizen Field Report"
SOURCE_URL = "user_observation"


def read_csv(path: Path) -> tuple[list[str], list[list[str]]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)
    return rows[0], rows[1:]


def write_csv(path: Path, header: list[str], rows: list[list[str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


def snap_grid(lat: float, lng: float) -> tuple[float, float]:
    return round(lat / GRID_STEP) * GRID_STEP, round(lng / GRID_STEP) * GRID_STEP


def append_incidents() -> int:
    path = DATASET / "waterlogging_incidents.csv"
    header, rows = read_csv(path)
    existing_ids = {row[0] for row in rows}

    added = 0
    for inc in NEW_INCIDENTS:
        if inc["incident_id"] in existing_ids:
            continue
        rows.append(
            [
                inc["incident_id"],
                str(inc["latitude"]),
                str(inc["longitude"]),
                inc["location_name"],
                inc["sector"],
                inc["date"],
                inc["time"],
                str(inc["severity"]),
                str(inc["depth_cm"]),
                str(inc["duration_minutes"]),
                SOURCE,
                SOURCE_URL,
                "1",
            ]
        )
        added += 1

    write_csv(path, header, rows)
    return added


def rainfall_bundle(intensity: float) -> tuple[float, float, float, float]:
    return (
        intensity,
        round(intensity * 1.8, 1),
        round(intensity * 2.4, 1),
        round(intensity * 3.2, 1),
    )


def append_ml_records() -> int:
    path = DATASET / "gurugram_waterlogging_ml.csv"
    header, rows = read_csv(path)
    existing_ids = {row[0] for row in rows}

    added = 0
    for inc, feat in zip(NEW_INCIDENTS, ML_FEATURES, strict=True):
        if feat["record_id"] in existing_ids:
            continue

        r1, r3, r6, r24 = rainfall_bundle(feat["rainfall_intensity_mm_hr"])
        wl = 1 if inc["severity"] > 0 else 0
        sev = min(inc["severity"], 4)

        rows.append(
            [
                feat["record_id"],
                str(inc["latitude"]),
                str(inc["longitude"]),
                str(feat["elevation_m"]),
                str(feat["road_slope_percent"]),
                str(feat["topographic_wetness_index"]),
                str(feat["distance_to_lowest_point_m"]),
                str(feat["distance_to_nearest_drain_m"]),
                str(feat["underpass"]),
                str(feat["historical_waterlogging_count"]),
                str(feat["known_waterlogging_hotspot"]),
                str(r1),
                str(r3),
                str(r6),
                str(r24),
                str(feat["rainfall_intensity_mm_hr"]),
                str(wl),
                str(sev),
            ]
        )
        added += 1

    write_csv(path, header, rows)
    return added


def append_training_records() -> int:
    path = DATASET / "gurugram_waterlogging_training.csv"
    header, rows = read_csv(path)
    existing_ids = {row[0] for row in rows}

    added = 0
    for inc, feat in zip(NEW_INCIDENTS, ML_FEATURES, strict=True):
        if feat["record_id"] in existing_ids:
            continue

        r1, r3, r6, r24 = rainfall_bundle(feat["rainfall_intensity_mm_hr"])
        wl = 1 if inc["severity"] > 0 else 0
        sev = min(inc["severity"], 4)
        road_type = "Underpass" if feat["underpass"] else "Sector Road"
        impassable = 1 if inc["severity"] >= 4 else 0
        disruption = min(inc["severity"], 3)

        rows.append(
            [
                feat["record_id"],
                str(inc["latitude"]),
                str(inc["longitude"]),
                inc["location_name"],
                inc["sector"],
                "Gurugram",
                inc["date"],
                inc["time"],
                SOURCE,
                "citizen_report",
                SOURCE_URL,
                "medium",
                str(r1),
                str(r3),
                str(r6),
                str(r24),
                str(feat["rainfall_intensity_mm_hr"]),
                "EVT_20250814",
                str(feat["elevation_m"]),
                str(feat["road_slope_percent"]),
                str(feat["topographic_wetness_index"]),
                str(feat["distance_to_lowest_point_m"]),
                "Citizen Observation Drain",
                str(feat["distance_to_nearest_drain_m"]),
                road_type,
                str(feat["underpass"]),
                str(feat["historical_waterlogging_count"]),
                str(feat["known_waterlogging_hotspot"]),
                str(wl),
                str(sev),
                str(inc["depth_cm"]),
                str(inc["duration_minutes"]),
                str(impassable),
                str(disruption),
                "0",
            ]
        )
        added += 1

    write_csv(path, header, rows)
    return added


def regenerate_spatial_coverage() -> int:
    incidents_path = DATASET / "waterlogging_incidents.csv"
    header, rows = read_csv(incidents_path)

    idx_lat = header.index("latitude")
    idx_lng = header.index("longitude")
    idx_sev = header.index("severity")

    grid_stats: dict[tuple[float, float], list[int]] = defaultdict(lambda: [0, 0])

    for row in rows:
        lat = float(row[idx_lat])
        lng = float(row[idx_lng])
        severity = int(float(row[idx_sev]))
        center = snap_grid(lat, lng)
        grid_stats[center][0] += 1
        if severity > 0:
            grid_stats[center][1] += 1

    out_rows: list[list[str]] = []
    for i, (center, (obs, wl)) in enumerate(sorted(grid_stats.items()), start=1):
        out_rows.append(
            [
                f"GRID_{i:03d}",
                str(center[0]),
                str(center[1]),
                str(obs),
                str(wl),
            ]
        )

    write_csv(
        DATASET / "spatial_coverage_report.csv",
        ["grid_id", "center_latitude", "center_longitude", "observation_count", "waterlogging_count"],
        out_rows,
    )
    return len(out_rows)


def main() -> None:
    inc_added = append_incidents()
    ml_added = append_ml_records()
    tr_added = append_training_records()
    grid_count = regenerate_spatial_coverage()

    print(f"Appended {inc_added} incidents")
    print(f"Appended {ml_added} ML records")
    print(f"Appended {tr_added} training records")
    print(f"Regenerated spatial_coverage_report.csv with {grid_count} grid cells")


if __name__ == "__main__":
    main()
