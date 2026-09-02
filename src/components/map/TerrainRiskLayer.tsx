import { useEffect, useMemo, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapStore } from "@/store/mapStore";
import {
  buildTerrainRiskSamples,
  metersPerPixel,
  nearestTerrainSample,
  samplesInBounds,
  terrainRiskStyle,
  type TerrainRiskSample,
} from "@/services/terrainRiskEngine";

const CANVAS_PAD = 0.5;

function paintPool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  fill: string,
  glow: string,
) {
  if (outerR < 2) return;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
  grad.addColorStop(0, fill);
  grad.addColorStop(0.55, glow);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.fill();
}

function paintTerrainCanvas(
  canvas: HTMLCanvasElement,
  map: L.Map,
  samples: TerrainRiskSample[],
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

  const visible = samplesInBounds(samples, paddedBounds);
  if (visible.length === 0) return;

  const centerLat = map.getCenter().lat;
  const mpp = metersPerPixel(centerLat, map.getZoom());

  ctx.globalCompositeOperation = "source-over";

  for (const sample of visible) {
    const style = terrainRiskStyle(sample.riskPct);
    const layerPt = map.latLngToLayerPoint([sample.lat, sample.lng]);
    const x = layerPt.x - topLeft.x;
    const y = layerPt.y - topLeft.y;
    const outerR = Math.min(style.radiusM / mpp, width * 0.35);
    const haloR = outerR * 1.25;

    if (x < -haloR || y < -haloR || x > width + haloR || y > height + haloR) {
      continue;
    }

    paintPool(ctx, x, y, haloR, style.ambient, "rgba(0,0,0,0)");
    paintPool(ctx, x, y, outerR, style.fill, style.glow);

    if (sample.riskPct >= 55) {
      paintPool(
        ctx,
        x,
        y,
        outerR * 0.35,
        style.fill,
        style.glow,
      );
    }
  }
}

export function TerrainRiskLayer() {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<L.Layer | null>(null);
  const samplesRef = useRef<TerrainRiskSample[]>([]);
  const renderedBoundsRef = useRef<L.LatLngBounds | null>(null);
  const rafRef = useRef<number | null>(null);

  const mlRecords = useMapStore((s) => s.mlRecords);
  const incidents = useMapStore((s) => s.incidents);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const weather = useMapStore((s) => s.weather);
  const showTerrainPaint = useMapStore((s) => s.showTerrainPaint);
  const setSelectedTerrain = useMapStore((s) => s.setSelectedTerrain);

  const liveRain = weather?.rain ?? 0;
  const livePrecip = weather?.precipitation ?? 0;

  const samples = useMemo(
    () =>
      buildTerrainRiskSamples(
        mlRecords,
        incidents,
        stormIntensity,
        liveRain,
        livePrecip,
      ),
    [mlRecords, incidents, stormIntensity, liveRain, livePrecip],
  );

  samplesRef.current = samples;

  const redraw = useCallback(() => {
    if (!canvasRef.current || !showTerrainPaint) return;
    const padded = map.getBounds().pad(CANVAS_PAD);
    renderedBoundsRef.current = padded;
    paintTerrainCanvas(canvasRef.current, map, samplesRef.current, padded);
  }, [map, showTerrainPaint]);

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
    if (!showTerrainPaint) return;

    const pane = map.getPane("terrainRiskPane") ?? map.createPane("terrainRiskPane");
    pane.style.zIndex = "350";
    pane.classList.add("leaflet-terrainRiskPane");

    const canvas = L.DomUtil.create("canvas", "terrain-risk-canvas") as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    canvas.style.willChange = "transform";
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    const TerrainLayer = L.Layer.extend({
      onAdd(this: L.Layer & { _map?: L.Map }) {
        this._map = map;
        scheduleRedraw();
      },
      onRemove() {
        /* cleaned up in effect */
      },
    });

    const layer = new TerrainLayer();
    layerRef.current = layer;
    layer.addTo(map);

    map.on("move", onMapMove);
    map.on("moveend", scheduleRedraw);
    map.on("zoomend", scheduleRedraw);
    map.on("viewreset", scheduleRedraw);
    map.on("resize", scheduleRedraw);
    scheduleRedraw();

    const onClick = (e: L.LeafletMouseEvent) => {
      const hit = nearestTerrainSample(
        e.latlng.lat,
        e.latlng.lng,
        samplesRef.current,
      );
      setSelectedTerrain(hit);
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
      layerRef.current = null;
    };
  }, [map, setSelectedTerrain, showTerrainPaint, onMapMove, scheduleRedraw]);

  useEffect(() => {
    scheduleRedraw();
  }, [samples, scheduleRedraw]);

  return null;
}
