import { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapStore } from "@/store/mapStore";
import {
  buildPaintedRoadList,
  highwaysForZoom,
  inferAccurateRiskAtPoint,
  type PaintedRoadSegment,
} from "@/services/roadRiskService";
import { MlSpatialIndex } from "@/services/mlSpatialIndex";
import type { TerrainRiskSample } from "@/services/terrainRiskEngine";

function roadsInView(
  roads: PaintedRoadSegment[],
  bounds: L.LatLngBounds,
  pad = 0.01,
): PaintedRoadSegment[] {
  const south = bounds.getSouth() - pad;
  const north = bounds.getNorth() + pad;
  const west = bounds.getWest() - pad;
  const east = bounds.getEast() + pad;

  return roads.filter(
    (r) =>
      r.maxLat >= south &&
      r.minLat <= north &&
      r.maxLng >= west &&
      r.minLng <= east,
  );
}

function paintRoadsCanvas(
  canvas: HTMLCanvasElement,
  map: L.Map,
  roads: PaintedRoadSegment[],
) {
  const size = map.getSize();
  const topLeft = map.containerPointToLayerPoint(L.point(0, 0));
  const zoom = map.getZoom();
  const allowed = highwaysForZoom(zoom);

  canvas.width = size.x;
  canvas.height = size.y;
  L.DomUtil.setPosition(canvas, topLeft);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size.x, size.y);

  const bounds = map.getBounds();
  const visible = roadsInView(roads, bounds);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const road of visible) {
    if (!allowed.has(road.highway)) continue;

    ctx.beginPath();
    let started = false;
    for (const [lat, lng] of road.latlngs) {
      const pt = map.latLngToLayerPoint([lat, lng]);
      const x = pt.x - topLeft.x;
      const y = pt.y - topLeft.y;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (!started) continue;

    ctx.strokeStyle = road.color;
    ctx.globalAlpha = road.opacity;
    ctx.lineWidth = road.weight;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function findRoadAt(
  map: L.Map,
  lat: number,
  lng: number,
  roads: PaintedRoadSegment[],
  zoom: number,
): PaintedRoadSegment | null {
  const allowed = highwaysForZoom(zoom);
  const clickPt = map.latLngToContainerPoint([lat, lng]);
  const threshold = 10;
  let best: PaintedRoadSegment | null = null;
  let bestDist = threshold;

  for (const road of roads) {
    if (!allowed.has(road.highway)) continue;
    for (let i = 1; i < road.latlngs.length; i++) {
      const [lat1, lng1] = road.latlngs[i - 1];
      const [lat2, lng2] = road.latlngs[i];
      const p1 = map.latLngToContainerPoint([lat1, lng1]);
      const p2 = map.latLngToContainerPoint([lat2, lng2]);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len2 = dx * dx + dy * dy;
      const t =
        len2 === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((clickPt.x - p1.x) * dx + (clickPt.y - p1.y) * dy) / len2,
              ),
            );
      const cx = p1.x + t * dx;
      const cy = p1.y + t * dy;
      const d = Math.hypot(clickPt.x - cx, clickPt.y - cy);
      if (d < bestDist) {
        bestDist = d;
        best = road;
      }
    }
  }

  return best;
}

export function RoadRiskLayer() {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roadsRef = useRef<PaintedRoadSegment[]>([]);
  const mlIndexRef = useRef<MlSpatialIndex | null>(null);
  const rafRef = useRef<number | null>(null);

  const [rawRoads, setRawRoads] = useState<GeoJSON.FeatureCollection | null>(null);
  const mlRecords = useMapStore((s) => s.mlRecords);
  const incidents = useMapStore((s) => s.incidents);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const weather = useMapStore((s) => s.weather);
  const setSelectedTerrain = useMapStore((s) => s.setSelectedTerrain);

  useEffect(() => {
    fetch("/data/gurugram_roads.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("missing roads file");
        return r.json();
      })
      .then(setRawRoads)
      .catch(console.error);
  }, []);

  const paintedRoads = useMemo(() => {
    if (!rawRoads || mlRecords.length === 0) return [];
    mlIndexRef.current = new MlSpatialIndex(mlRecords);
    return buildPaintedRoadList(
      rawRoads,
      mlRecords,
      incidents,
      stormIntensity,
      weather?.rain ?? 0,
      weather?.precipitation ?? 0,
    );
  }, [rawRoads, mlRecords, incidents, stormIntensity, weather]);

  roadsRef.current = paintedRoads;

  useEffect(() => {
    const pane = map.getPane("roadPaintPane") ?? map.createPane("roadPaintPane");
    pane.style.zIndex = "450";
    pane.className = "leaflet-roadPaintPane";

    const canvas = L.DomUtil.create("canvas", "road-paint-canvas") as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    const redraw = () => {
      if (!canvasRef.current) return;
      paintRoadsCanvas(canvasRef.current, map, roadsRef.current);
    };

    const scheduleRedraw = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        redraw();
      });
    };

    const layer = L.layerGroup().addTo(map);
    redraw();

    map.on("move", scheduleRedraw);
    map.on("zoom", scheduleRedraw);
    map.on("resize", scheduleRedraw);

    const onClick = (e: L.LeafletMouseEvent) => {
      const hit = findRoadAt(
        map,
        e.latlng.lat,
        e.latlng.lng,
        roadsRef.current,
        map.getZoom(),
      );
      if (!hit) {
        setSelectedTerrain(null);
        return;
      }
      const mid = hit.latlngs[Math.floor(hit.latlngs.length / 2)];
      const clickRisk =
        mlIndexRef.current
          ? inferAccurateRiskAtPoint(
              mid[0],
              mid[1],
              mlIndexRef.current,
              incidents,
              stormIntensity,
              weather?.rain ?? 0,
              weather?.precipitation ?? 0,
            )
          : hit.riskPct;
      const sample: TerrainRiskSample = {
        id: `road-${hit.name || hit.highway}`,
        lat: mid[0],
        lng: mid[1],
        riskPct: Math.round(clickRisk),
        label: hit.name || `${hit.highway} street`,
        depthCm: Math.round((hit.riskPct / 100) * 80),
        underpass: hit.name.toLowerCase().includes("underpass"),
        source: "ml",
      };
      setSelectedTerrain(sample);
    };

    map.on("click", onClick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      map.off("move", scheduleRedraw);
      map.off("zoom", scheduleRedraw);
      map.off("resize", scheduleRedraw);
      map.off("click", onClick);
      layer.remove();
      canvas.remove();
      canvasRef.current = null;
    };
  }, [map, setSelectedTerrain]);

  useEffect(() => {
    if (!canvasRef.current) return;
    paintRoadsCanvas(canvasRef.current, map, paintedRoads);
  }, [map, paintedRoads]);

  return null;
}
