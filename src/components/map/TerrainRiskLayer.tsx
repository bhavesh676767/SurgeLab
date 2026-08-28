import { useEffect, useMemo, useRef } from "react";
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
) {
  const size = map.getSize();
  const topLeft = map.containerPointToLayerPoint(L.point(0, 0));

  canvas.width = size.x;
  canvas.height = size.y;
  L.DomUtil.setPosition(canvas, topLeft);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size.x, size.y);

  const bounds = map.getBounds();
  const visible = samplesInBounds(samples, bounds);
  if (visible.length === 0) return;

  const centerLat = map.getCenter().lat;
  const mpp = metersPerPixel(centerLat, map.getZoom());

  ctx.globalCompositeOperation = "source-over";

  for (const sample of visible) {
    const style = terrainRiskStyle(sample.riskPct);
    const layerPt = map.latLngToLayerPoint([sample.lat, sample.lng]);
    const x = layerPt.x - topLeft.x;
    const y = layerPt.y - topLeft.y;
    const outerR = Math.min(style.radiusM / mpp, size.x * 0.35);
    const haloR = outerR * 1.25;

    if (x < -haloR || y < -haloR || x > size.x + haloR || y > size.y + haloR) {
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

  useEffect(() => {
    if (!showTerrainPaint) return;

    const pane = map.getPane("terrainRiskPane") ?? map.createPane("terrainRiskPane");
    pane.style.zIndex = "350";
    pane.className = "leaflet-terrainRiskPane";

    const canvas = L.DomUtil.create("canvas", "terrain-risk-canvas") as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    const redraw = () => {
      if (!canvasRef.current) return;
      paintTerrainCanvas(canvasRef.current, map, samplesRef.current);
    };

    const TerrainLayer = L.Layer.extend({
      onAdd(this: L.Layer & { _map?: L.Map }) {
        this._map = map;
        redraw();
      },
      onRemove() {
        /* cleaned up in effect */
      },
    });

    const layer = new TerrainLayer();
    layerRef.current = layer;
    layer.addTo(map);

    map.on("move", redraw);
    map.on("zoom", redraw);
    map.on("resize", redraw);
    redraw();

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
      map.off("move", redraw);
      map.off("zoom", redraw);
      map.off("resize", redraw);
      map.off("click", onClick);
      layer.remove();
      canvas.remove();
      canvasRef.current = null;
      layerRef.current = null;
    };
  }, [map, setSelectedTerrain, showTerrainPaint]);

  useEffect(() => {
    if (!canvasRef.current || !showTerrainPaint) return;
    paintTerrainCanvas(canvasRef.current, map, samples);
  }, [map, samples, showTerrainPaint]);

  return null;
}
