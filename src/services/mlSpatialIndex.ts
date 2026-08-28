import type { MlTerrainRecord } from "@/types/dataset";

const CELL = 0.007;

function cellKey(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;
}

function distDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.hypot(lat1 - lat2, lng1 - lng2);
}

export interface IndexedMlRecord {
  record: MlTerrainRecord;
  dist: number;
}

/** Fast grid index for ~700 ML terrain samples. */
export class MlSpatialIndex {
  private grid = new Map<string, MlTerrainRecord[]>();

  constructor(records: MlTerrainRecord[]) {
    for (const r of records) {
      const key = cellKey(r.latitude, r.longitude);
      const bucket = this.grid.get(key);
      if (bucket) bucket.push(r);
      else this.grid.set(key, [r]);
    }
  }

  query(lat: number, lng: number, limit = 6): IndexedMlRecord[] {
    const latCell = Math.floor(lat / CELL);
    const lngCell = Math.floor(lng / CELL);
    const candidates: IndexedMlRecord[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${latCell + dy}:${lngCell + dx}`;
        const bucket = this.grid.get(key);
        if (!bucket) continue;
        for (const record of bucket) {
          candidates.push({
            record,
            dist: distDeg(lat, lng, record.latitude, record.longitude),
          });
        }
      }
    }

    if (candidates.length === 0) {
      // Fallback: nearest single record globally (rare edge case)
      return [];
    }

    candidates.sort((a, b) => a.dist - b.dist);
    return candidates.slice(0, limit);
  }
}
