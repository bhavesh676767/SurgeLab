import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapStore } from "@/store/mapStore";
import {
  buildPaintedRoadList,
  highwaysForZoom,
  inferAccurateRiskAtPoint,
  RoadSpatialIndex,
  type PaintedRoadSegment,
} from "@/services/roadRiskService";
import { MlSpatialIndex } from "@/services/mlSpatialIndex";
import type { TerrainRiskSample } from "@/services/terrainRiskEngine";

const CANVAS_PAD = 0.5; // 50% viewport buffer around view for 60fps native GPU panning

function findRoadAt(
  map: L.Map,
  lat: number,
  lng: number,
  roads: PaintedRoadSegment[],
  zoom: number,
): PaintedRoadSegment | null {
  const allowed = highwaysForZoom(zoom);
  const clickPt = map.latLngToContainerPoint([lat, lng]);
  const threshold = 12;
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
  const spatialIndexRef = useRef<RoadSpatialIndex | null>(null);
  const mlIndexRef = useRef<MlSpatialIndex | null>(null);
  const renderedBoundsRef = useRef<L.LatLngBounds | null>(null);
  const rafRef = useRef<number | null>(null);

  const [rawRoads, setRawRoads] = useState<GeoJSON.FeatureCollection | null>(null);
  const mlRecords = useMapStore((s) => s.mlRecords);
  const incidents = useMapStore((s) => s.incidents);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const weather = useMapStore((s) => s.weather);
  const setSelectedTerrain = useMapStore((s) => s.setSelectedTerrain);
  const showTerrainPaint = useMapStore((s) => s.showTerrainPaint);

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
    const roads = buildPaintedRoadList(
      rawRoads,
      mlRecords,
      incidents,
      stormIntensity,
      weather?.rain ?? 0,
      weather?.precipitation ?? 0,
    );
    spatialIndexRef.current = new RoadSpatialIndex(roads);
    return roads;
  }, [rawRoads, mlRecords, incidents, stormIntensity, weather]);

  roadsRef.current = paintedRoads;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (!showTerrainPaint || roadsRef.current.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
      return;
    }

    canvas.style.display = "block";

    const zoom = map.getZoom();
    const allowed = highwaysForZoom(zoom);
    const mapBounds = map.getBounds();
    const paddedBounds = mapBounds.pad(CANVAS_PAD);
    renderedBoundsRef.current = paddedBounds;

    const nw = paddedBounds.getNorthWest();
    const se = paddedBounds.getSouthEast();
    const topLeft = map.latLngToLayerPoint(nw);
    const bottomRight = map.latLngToLayerPoint(se);

    const width = Math.max(1, Math.ceil(bottomRight.x - topLeft.x));
    const height = Math.max(1, Math.ceil(bottomRight.y - topLeft.y));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    L.DomUtil.setPosition(canvas, topLeft);

    ctx.clearRect(0, 0, width, height);

    // Query spatial index for candidate roads inside padded bounds
    const index = spatialIndexRef.current;
    const candidates = index
      ? index.query(paddedBounds)
      : roadsRef.current;

    if (candidates.length === 0) return;

    // Group roads by style to batch draw calls into a handful of strokes
    const groups = new Map<
      string,
      {
        color: string;
        weight: number;
        opacity: number;
        roads: PaintedRoadSegment[];
      }
    >();

    for (const road of candidates) {
      if (!allowed.has(road.highway)) continue;
      const key = `${road.color}|${road.weight}|${road.opacity}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          color: road.color,
          weight: road.weight,
          opacity: road.opacity,
          roads: [],
        };
        groups.set(key, group);
      }
      group.roads.push(road);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const group of groups.values()) {
      ctx.strokeStyle = group.color;
      ctx.lineWidth = group.weight;
      ctx.globalAlpha = group.opacity;
      ctx.beginPath();

      for (const road of group.roads) {
        let started = false;
        for (let i = 0; i < road.latlngs.length; i++) {
          const pt = map.latLngToLayerPoint(road.latlngs[i]);
          const x = pt.x - topLeft.x;
          const y = pt.y - topLeft.y;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }, [map, showTerrainPaint]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  useEffect(() => {
    scheduleRedraw();
  }, [showTerrainPaint, paintedRoads, scheduleRedraw]);

  // Check on move if current viewport exceeds buffered canvas area
  const onMapMove = useCallback(() => {
    const rendered = renderedBoundsRef.current;
    if (!rendered) {
      scheduleRedraw();
      return;
    }
    const currentBounds = map.getBounds();
    // Only schedule redraw if the user has dragged beyond our padded bounds
    if (
      currentBounds.getSouth() < rendered.getSouth() ||
      currentBounds.getNorth() > rendered.getNorth() ||
      currentBounds.getWest() < rendered.getWest() ||
      currentBounds.getEast() > rendered.getEast()
    ) {
      scheduleRedraw();
    }
  }, [map, scheduleRedraw]);

  useEffect(() => {
    const pane = map.getPane("roadPaintPane") ?? map.createPane("roadPaintPane");
    pane.style.zIndex = "450";
    pane.classList.add("leaflet-roadPaintPane");

    const canvas = L.DomUtil.create("canvas", "road-paint-canvas") as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    canvas.style.willChange = "transform";
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    const layer = L.layerGroup().addTo(map);
    scheduleRedraw();

    map.on("move", onMapMove);
    map.on("moveend", scheduleRedraw);
    map.on("zoomend", scheduleRedraw);
    map.on("viewreset", scheduleRedraw);
    map.on("resize", scheduleRedraw);

    const onClick = (e: L.LeafletMouseEvent) => {
      const index = spatialIndexRef.current;
      const candidates = index
        ? index.queryPoint(e.latlng.lat, e.latlng.lng, 0.003)
        : roadsRef.current;

      const hit = findRoadAt(
        map,
        e.latlng.lat,
        e.latlng.lng,
        candidates,
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
      map.off("move", onMapMove);
      map.off("moveend", scheduleRedraw);
      map.off("zoomend", scheduleRedraw);
      map.off("viewreset", scheduleRedraw);
      map.off("resize", scheduleRedraw);
      map.off("click", onClick);
      layer.remove();
      canvas.remove();
      canvasRef.current = null;
    };
  }, [map, setSelectedTerrain, onMapMove, scheduleRedraw, incidents, stormIntensity, weather]);

  useEffect(() => {
    scheduleRedraw();
  }, [paintedRoads, scheduleRedraw]);

  return null;
}
