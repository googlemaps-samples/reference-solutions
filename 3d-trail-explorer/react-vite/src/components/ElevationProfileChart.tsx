import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { ElevationSample, TrailMetrics } from '../types/explorer';

interface ElevationProfileChartProps {
  samples: ElevationSample[];
  metrics: TrailMetrics;
  isLoading: boolean;
  error: string | null;
  activeSampleIndex: number | null;
  onHoverSample: (sample: ElevationSample | null) => void;
  onSelectSample: (sample: ElevationSample) => void;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 128;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

export const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({
  samples,
  metrics,
  isLoading,
  error,
  activeSampleIndex,
  onHoverSample,
  onSelectSample
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (samples.length < 2) {
      return null;
    }
    const minE = Math.floor(metrics.minElevationM / 25) * 25;
    const maxE = Math.ceil(metrics.maxElevationM / 25) * 25;
    const spanE = Math.max(maxE - minE, 40);
    const maxDist = Math.max(metrics.totalDistanceKm, 0.1);

    const plotW = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const coords = samples.map((s) => {
      const x = PAD_LEFT + (s.distanceKm / maxDist) * plotW;
      const y = PAD_TOP + (1 - (s.elevation - minE) / spanE) * plotH;
      return { x, y, sample: s };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    const baselineY = PAD_TOP + plotH;
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

    const midE = Math.round((minE + maxE) / 2);

    return {
      coords,
      linePath,
      areaPath,
      minE,
      midE,
      maxE,
      baselineY,
      plotW,
      plotH
    };
  }, [samples, metrics]);

  const highlightedIndex = hoverIdx ?? activeSampleIndex;
  const highlightedPoint =
    geometry && highlightedIndex != null
      ? geometry.coords[highlightedIndex] ?? null
      : null;

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!geometry || geometry.coords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = CHART_WIDTH / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;

    let nearest = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < geometry.coords.length; i++) {
      const d = Math.abs(geometry.coords[i].x - svgX);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
    onHoverSample(geometry.coords[nearest].sample);
  };

  const handlePointerLeave = () => {
    setHoverIdx(null);
    onHoverSample(null);
  };

  const handleClick = () => {
    if (!geometry || hoverIdx == null) return;
    const target = geometry.coords[hoverIdx]?.sample;
    if (target) {
      onSelectSample(target);
    }
  };

  return (
    <section
      data-testid="elevation-profile-panel"
      className="panel-card elevation-panel"
      aria-label="Live Trail Elevation Profile"
    >
      <div className="panel-header">
        <div className="panel-title-group">
          <TrendingUp size={15} className="panel-icon" />
          <h2 className="panel-title">Live Elevation Profile</h2>
        </div>
        <span className="elevation-source-tag">Elevation API</span>
      </div>

      <div
        data-testid="trail-metrics-summary"
        className="metrics-grid"
      >
        <div className="metric-box">
          <span className="metric-label">Distance</span>
          <span className="metric-val">
            {metrics.totalDistanceKm > 0
              ? `${metrics.totalDistanceKm.toFixed(1)} km`
              : '—'}
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Ascent</span>
          <span className="metric-val metric-ascent">
            {metrics.totalAscentM > 0
              ? `+${Math.round(metrics.totalAscentM)} m`
              : '—'}
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Peak</span>
          <span className="metric-val">
            {metrics.maxElevationM > 0
              ? `${Math.round(metrics.maxElevationM)} m`
              : '—'}
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Base</span>
          <span className="metric-val">
            {metrics.minElevationM > 0 && Number.isFinite(metrics.minElevationM)
              ? `${Math.round(metrics.minElevationM)} m`
              : '—'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="chart-placeholder">
          Sampling live elevation along Emerald Bay trail...
        </div>
      ) : error ? (
        <div className="chart-placeholder chart-error">{error}</div>
      ) : geometry ? (
        <div className="chart-wrapper">
          <svg
            data-testid="elevation-profile-chart"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="elevation-svg"
            role="img"
            aria-label="Trail elevation profile chart. Hover to inspect elevation and click to fly camera."
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            onClick={handleClick}
          >
            <defs>
              <linearGradient id="tahoeElevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.45)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.04)" />
              </linearGradient>
            </defs>

            {/* Horizontal elevation grid lines */}
            {[
              { label: `${geometry.maxE}m`, y: PAD_TOP },
              { label: `${geometry.midE}m`, y: PAD_TOP + geometry.plotH / 2 },
              { label: `${geometry.minE}m`, y: geometry.baselineY }
            ].map((tick) => (
              <g key={tick.label}>
                <line
                  x1={PAD_LEFT}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="rgba(148, 163, 184, 0.18)"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD_LEFT - 5}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="chart-axis-text"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Distance axis labels */}
            <text
              x={PAD_LEFT}
              y={CHART_HEIGHT - 5}
              textAnchor="start"
              className="chart-axis-text"
            >
              0 km
            </text>
            <text
              x={CHART_WIDTH - PAD_RIGHT}
              y={CHART_HEIGHT - 5}
              textAnchor="end"
              className="chart-axis-text"
            >
              {metrics.totalDistanceKm.toFixed(1)} km
            </text>

            {/* Area & 3D-matched Red Trail Line */}
            <path d={geometry.areaPath} fill="url(#tahoeElevFill)" />
            <path
              d={geometry.linePath}
              fill="none"
              stroke="rgb(255, 0, 0)"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {highlightedPoint && (
              <g>
                <line
                  x1={highlightedPoint.x}
                  x2={highlightedPoint.x}
                  y1={PAD_TOP}
                  y2={geometry.baselineY}
                  stroke="rgba(248, 250, 252, 0.55)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <circle
                  cx={highlightedPoint.x}
                  cy={highlightedPoint.y}
                  r={4.2}
                  fill="#ffffff"
                  stroke="rgb(255, 0, 0)"
                  strokeWidth={2.2}
                />
              </g>
            )}
          </svg>

          <div className="chart-readout">
            {highlightedPoint ? (
              <span>
                Km {highlightedPoint.sample.distanceKm.toFixed(2)} ·{' '}
                <strong>
                  {Math.round(highlightedPoint.sample.elevation)} m
                </strong>{' '}
                (click chart to fly)
              </span>
            ) : (
              <span>Hover profile to inspect · Click to fly 3D camera</span>
            )}
          </div>
        </div>
      ) : (
        <div className="chart-placeholder">No elevation samples available.</div>
      )}
    </section>
  );
};
