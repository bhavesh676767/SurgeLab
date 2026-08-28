import { useMemo } from "react";
import { Polygon, Popup } from "react-leaflet";
import { useMapStore } from "@/store/mapStore";
import { inferRiskPercent, riskPolygonStyle } from "@/services/mlInferenceEngine";
import type { RegionGridCell } from "@/types/dataset";

function GridPopup({
  cell,
  riskPct,
}: {
  cell: RegionGridCell;
  riskPct: number;
}) {
  return (
    <div className="min-w-[200px] space-y-2 p-1 text-sm text-gray-900">
      <p className="font-semibold">Grid {cell.gridId}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-400">Predicted risk</dt>
          <dd className="font-semibold text-gray-900">{riskPct.toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-gray-400">Water depth</dt>
          <dd className="font-medium">{cell.avgDepthCm.toFixed(1)} cm</dd>
        </div>
        <div>
          <dt className="text-gray-400">Drain proximity</dt>
          <dd className="font-medium">{cell.avgDrainDistanceM.toFixed(1)} m</dd>
        </div>
        <div>
          <dt className="text-gray-400">Incidents</dt>
          <dd className="font-medium">
            {cell.waterloggingCount}/{cell.observationCount}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function RegionHeatmapLayer() {
  const gridCells = useMapStore((s) => s.gridCells);
  const stormIntensity = useMapStore((s) => s.stormIntensity);
  const weather = useMapStore((s) => s.weather);

  const liveRain = weather?.rain ?? 0;
  const livePrecip = weather?.precipitation ?? 0;

  const cellsWithRisk = useMemo(
    () =>
      gridCells.map((cell) => {
        const riskPct = inferRiskPercent({
          baseRiskPct: cell.baseRiskPct,
          avgDrainDistanceM: cell.avgDrainDistanceM,
          avgDepthCm: cell.avgDepthCm,
          avgRainfallIntensity: cell.avgRainfallIntensity,
          avgWetnessIndex: cell.avgWetnessIndex,
          stormIntensity,
          liveRainMm: liveRain,
          livePrecipitationMm: livePrecip,
        });
        return { cell, riskPct };
      }),
    [gridCells, stormIntensity, liveRain, livePrecip],
  );

  return (
    <>
      {cellsWithRisk.map(({ cell, riskPct }) => (
        <Polygon
          key={cell.gridId}
          positions={cell.polygon}
          pathOptions={riskPolygonStyle(riskPct)}
          eventHandlers={{
            click: () => {
              /* popup opens on click */
            },
          }}
        >
          <Popup>
            <GridPopup cell={cell} riskPct={riskPct} />
          </Popup>
        </Polygon>
      ))}
    </>
  );
}
