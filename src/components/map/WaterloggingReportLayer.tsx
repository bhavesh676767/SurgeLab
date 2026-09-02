import { useEffect, useRef, useCallback, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapStore, type WaterloggingReport } from "@/store/mapStore";
import {
  loadWaterloggingReports,
  saveWaterloggingReports,
  deleteWaterloggingReports,
} from "@/services/waterloggingReportService";

type Road = [number, number][];
type SnappedPoint = { lat: number; lng: number };
const MAX_SAMPLES_PER_STROKE = 80;
const CANVAS_PAD = 0.5;

function severityColor(severity: number) {
  const hue = 52 - Math.round(severity * 52);
  return `hsl(${hue} 100% ${58 - severity * 9}%)`;
}

interface RoadSegment {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

class RoadLineSpatialIndex {
  private cellSize = 0.01;
  private grid = new Map<string, RoadSegment[]>();

  constructor(roads: Road[]) {
    for (const road of roads) {
      for (let i = 1; i < road.length; i++) {
        const lng1 = road[i - 1][0];
        const lat1 = road[i - 1][1];
        const lng2 = road[i][0];
        const lat2 = road[i][1];
        const seg: RoadSegment = { lat1, lng1, lat2, lng2 };

        const minX = Math.floor(Math.min(lng1, lng2) / this.cellSize);
        const maxX = Math.floor(Math.max(lng1, lng2) / this.cellSize);
        const minY = Math.floor(Math.min(lat1, lat2) / this.cellSize);
        const maxY = Math.floor(Math.max(lat1, lat2) / this.cellSize);

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const key = `${y}:${x}`;
            let b = this.grid.get(key);
            if (!b) {
              b = [];
              this.grid.set(key, b);
            }
            b.push(seg);
          }
        }
      }
    }
  }

  query(lat: number, lng: number, pad = 0.005): RoadSegment[] {
    const minX = Math.floor((lng - pad) / this.cellSize);
    const maxX = Math.floor((lng + pad) / this.cellSize);
    const minY = Math.floor((lat - pad) / this.cellSize);
    const maxY = Math.floor((lat + pad) / this.cellSize);
    const result: RoadSegment[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const b = this.grid.get(`${y}:${x}`);
        if (b) {
          for (let i = 0; i < b.length; i++) result.push(b[i]);
        }
      }
    }
    return result;
  }
}

function nearestRoadPointIndexed(
  map: L.Map,
  sourceLatLng: L.LatLng,
  index: RoadLineSpatialIndex | null,
): SnappedPoint | null {
  if (!index) return null;
  const click = map.latLngToContainerPoint(sourceLatLng);
  const candidates = index.query(sourceLatLng.lat, sourceLatLng.lng, 0.004);
  let nearest: L.Point | null = null;
  let bestDistance = 72;

  for (const seg of candidates) {
    const a = map.latLngToContainerPoint([seg.lat1, seg.lng1]);
    const b = map.latLngToContainerPoint([seg.lat2, seg.lng2]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const ratio =
      lengthSq === 0
        ? 0
        : Math.max(0, Math.min(1, ((click.x - a.x) * dx + (click.y - a.y) * dy) / lengthSq));
    const candidate = L.point(a.x + dx * ratio, a.y + dy * ratio);
    const distance = candidate.distanceTo(click);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = candidate;
    }
  }

  if (!nearest) return null;
  const snappedLatLng = map.containerPointToLatLng(nearest);
  return { lat: snappedLatLng.lat, lng: snappedLatLng.lng };
}

function computeSeverities(reports: WaterloggingReport[]) {
  const severities = new Map<string, number>();
  for (let i = 0; i < reports.length; i++) {
    const rep = reports[i];
    let density = 0;
    for (let j = 0; j < reports.length; j++) {
      const other = reports[j];
      const distance = Math.hypot(rep.lat - other.lat, rep.lng - other.lng);
      if (distance < 0.00055) density += 1 - distance / 0.00055;
    }
    severities.set(rep.id, Math.min(1, density / 5));
  }
  return severities;
}

function drawReports(
  canvas: HTMLCanvasElement,
  map: L.Map,
  reports: WaterloggingReport[],
  severities: Map<string, number>,
  paddedBounds: L.LatLngBounds,
) {
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

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (reports.length === 0) return;

  const visible = reports.filter((report) =>
    paddedBounds.contains([report.lat, report.lng]),
  );

  for (const report of visible) {
    let nearest: WaterloggingReport | null = null;
    let nearestDistance = 0.00045;
    for (const candidate of visible) {
      if (candidate.id === report.id) continue;
      const distance = Math.hypot(candidate.lat - report.lat, candidate.lng - report.lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate;
      }
    }
    if (!nearest) continue;
    const from = map.latLngToLayerPoint([report.lat, report.lng]).subtract(topLeft);
    const to = map.latLngToLayerPoint([nearest.lat, nearest.lng]).subtract(topLeft);
    const startSeverity = severities.get(report.id) ?? 0;
    const endSeverity = severities.get(nearest.id) ?? 0;
    const maxSev = Math.max(startSeverity, endSeverity);
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, severityColor(startSeverity));
    gradient.addColorStop(1, severityColor(endSeverity));
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 7 + maxSev * 5;
    ctx.shadowColor = severityColor(maxSev);
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  for (const report of visible) {
    const point = map.latLngToLayerPoint([report.lat, report.lng]).subtract(topLeft);
    const severity = severities.get(report.id) ?? 0;
    const radius = 5 + severity * 5;
    const glow = ctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, radius * 2.2);
    glow.addColorStop(0, severityColor(severity));
    glow.addColorStop(0.45, severityColor(severity));
    glow.addColorStop(1, "rgba(255, 70, 0, 0)");
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function WaterloggingReportLayer() {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roadIndexRef = useRef<RoadLineSpatialIndex | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<SnappedPoint | null>(null);
  const renderedBoundsRef = useRef<L.LatLngBounds | null>(null);
  const rafRef = useRef<number | null>(null);

  const reports = useMapStore((s) => s.waterloggingReports);
  const isReporting = useMapStore((s) => s.isReportingWaterlogging);
  const tool = useMapStore((s) => s.groundTruthTool);
  const setReports = useMapStore((s) => s.setWaterloggingReports);
  const addReports = useMapStore((s) => s.addWaterloggingReports);
  const removeReports = useMapStore((s) => s.removeWaterloggingReports);

  const severities = useMemo(() => computeSeverities(reports), [reports]);

  useEffect(() => {
    loadWaterloggingReports().then(setReports);
    fetch("/data/gurugram_roads.geojson")
      .then((response) => response.json())
      .then((data: GeoJSON.FeatureCollection) => {
        const roads = data.features
          .filter((feature) => feature.geometry?.type === "LineString")
          .map((feature) => feature.geometry.coordinates as Road);
        roadIndexRef.current = new RoadLineSpatialIndex(roads);
      })
      .catch(console.error);
  }, [setReports]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const padded = map.getBounds().pad(CANVAS_PAD);
    renderedBoundsRef.current = padded;
    drawReports(canvas, map, reports, severities, padded);
  }, [map, reports, severities]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  const onMapMove = useCallback(() => {
    const rendered = renderedBoundsRef.current;
    if (!rendered) {
      scheduleRedraw();
      return;
    }
    const currentBounds = map.getBounds();
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
    const pane = map.getPane("waterloggingReportPane") ?? map.createPane("waterloggingReportPane");
    pane.style.zIndex = "460";
    pane.classList.add("leaflet-waterloggingReportPane");
    const canvas = L.DomUtil.create("canvas", "waterlogging-report-canvas") as HTMLCanvasElement;
    canvas.style.willChange = "transform";
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    scheduleRedraw();

    map.on("move", onMapMove);
    map.on("moveend", scheduleRedraw);
    map.on("zoomend", scheduleRedraw);
    map.on("viewreset", scheduleRedraw);
    map.on("resize", scheduleRedraw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      map.off("move", onMapMove);
      map.off("moveend", scheduleRedraw);
      map.off("zoomend", scheduleRedraw);
      map.off("viewreset", scheduleRedraw);
      map.off("resize", scheduleRedraw);
      canvas.remove();
      canvasRef.current = null;
    };
  }, [map, onMapMove, scheduleRedraw]);

  useEffect(() => {
    scheduleRedraw();
  }, [scheduleRedraw]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.pointerEvents = isReporting ? "auto" : "none";
      canvasRef.current.style.touchAction = isReporting ? "none" : "auto";
    }
  }, [isReporting]);

  useEffect(() => {
    if (!isReporting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const points: WaterloggingReport[] = [];
    const idsToErase = new Set<string>();

    const addPoint = (event: PointerEvent) => {
      const snapped = nearestRoadPointIndexed(
        map,
        map.mouseEventToLatLng(event),
        roadIndexRef.current,
      );
      if (!snapped) return;
      if (
        lastPointRef.current &&
        Math.hypot(
          snapped.lat - lastPointRef.current.lat,
          snapped.lng - lastPointRef.current.lng,
        ) < 0.000035
      )
        return;
      lastPointRef.current = snapped;
      if (tool === "erase") {
        for (const report of reports) {
          if (Math.hypot(snapped.lat - report.lat, snapped.lng - report.lng) < 0.00018) {
            idsToErase.add(report.id);
          }
        }
      } else {
        points.push({ id: crypto.randomUUID(), ...snapped, createdAt: new Date().toISOString() });
      }
    };

    const start = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      drawingRef.current = true;
      lastPointRef.current = null;
      map.dragging.disable();
      canvas.setPointerCapture?.(event.pointerId);
      addPoint(event);
    };

    const move = (event: PointerEvent) => {
      event.preventDefault();
      if (drawingRef.current && points.length < MAX_SAMPLES_PER_STROKE) addPoint(event);
    };

    const end = (event?: PointerEvent) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      map.dragging.enable();
      if (event && canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (tool === "paint" && points.length) {
        addReports(points);
        void saveWaterloggingReports(points);
        points.length = 0;
      }
      if (tool === "erase" && idsToErase.size) {
        const ids = [...idsToErase];
        removeReports(ids);
        void deleteWaterloggingReports(ids);
        idsToErase.clear();
      }
    };

    canvas.addEventListener("pointerdown", start, { passive: false });
    canvas.addEventListener("pointermove", move, { passive: false });
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("pointerleave", end);

    return () => {
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
      canvas.removeEventListener("pointerleave", end);
      map.dragging.enable();
    };
  }, [addReports, isReporting, map, removeReports, reports, tool]);

  return null;
}
