'use client';

import React, { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Mountain, Route } from 'lucide-react';
import type { ElevationSample, TrailMetrics } from '@/types/explorer';

interface ElevationProfileChartProps {
  samples: ElevationSample[];
  metrics: TrailMetrics;
  isLoading: boolean;
  error: string | null;
  activeSampleIndex: number | null;
  onSelectSample: (sample: ElevationSample) => void;
}

const CHART_WIDTH = 340;
const CHART_HEIGHT = 128;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

export function ElevationProfileChart({
  samples,
  metrics,
  isLoading,
  error,
  activeSampleIndex,
  onSelectSample,
}: ElevationProfileChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { linePath, areaPath, points, yTicks } = useMemo(() => {
    if (samples.length < 2) {
      return {
        linePath: '',
        areaPath: '',
        points: [] as Array<{ x: number; y: number; sample: ElevationSample }>,
        yTicks: [] as Array<{ value: number; y: number }>,
      };
    }

    const minE = Math.floor(metrics.minElevationM / 20) * 20;
    const maxE = Math.ceil(metrics.maxElevationM / 20) * 20;
    const rangeE = Math.max(maxE - minE, 40);
    const maxDist = Math.max(metrics.totalDistanceKm, 0.1);

    const pts = samples.map((sample) => {
      const x = PAD_LEFT + (sample.distanceKm / maxDist) * plotWidth;
      const y =
        PAD_TOP +
        plotHeight -
        ((sample.elevation - minE) / rangeE) * plotHeight;
      return { x, y, sample };
    });

    const line = pts
      .map(
        (p, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      )
      .join(' ');

    const baselineY = PAD_TOP + plotHeight;
    const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${baselineY} L ${pts[0].x.toFixed(1)} ${baselineY} Z`;

    const midE = minE + rangeE / 2;
    const ticks = [
      { value: maxE, y: PAD_TOP },
      { value: midE, y: PAD_TOP + plotHeight / 2 },
      { value: minE, y: baselineY },
    ];

    return { linePath: line, areaPath: area, points: pts, yTicks: ticks };
  }, [samples, metrics, plotWidth, plotHeight]);

  const highlightedIndex = hoveredIndex ?? activeSampleIndex;
  const highlightedPoint =
    highlightedIndex !== null ? points[highlightedIndex] ?? null : null;

  return (
    <section
      data-testid="elevation-profile-panel"
      className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-red-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Live Elevation Profile
          </h2>
        </div>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          Elevation API
        </span>
      </div>

      {/* Trail Metrics Summary */}
      <div
        data-testid="trail-metrics-summary"
        className="mb-2.5 grid grid-cols-4 gap-1.5"
      >
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Route className="h-3 w-3 text-red-400" />
            <span>Dist</span>
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-100">
            {samples.length > 0
              ? `${metrics.totalDistanceKm.toFixed(1)} km`
              : '--'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Mountain className="h-3 w-3 text-amber-400" />
            <span>Peak</span>
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-100">
            {samples.length > 0
              ? `${Math.round(metrics.maxElevationM)} m`
              : '--'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
            <span>Gain</span>
          </div>
          <div className="mt-0.5 text-xs font-semibold text-emerald-300">
            {samples.length > 0
              ? `+${Math.round(metrics.totalAscentM)} m`
              : '--'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <ArrowDownRight className="h-3 w-3 text-sky-400" />
            <span>Loss</span>
          </div>
          <div className="mt-0.5 text-xs font-semibold text-sky-300">
            {samples.length > 0
              ? `-${Math.round(metrics.totalDescentM)} m`
              : '--'}
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div
        data-testid="elevation-profile-chart"
        className="relative rounded-lg border border-slate-800/80 bg-slate-950/80 p-1.5"
      >
        {isLoading ? (
          <div className="flex h-[128px] items-center justify-center text-xs text-slate-400">
            Sampling Sierra Nevada elevation along trail...
          </div>
        ) : error ? (
          <div className="flex h-[128px] flex-col items-center justify-center px-3 text-center text-[11px] text-slate-400">
            <p className="font-medium text-amber-300">
              Elevation sampling awaiting API key
            </p>
            <p className="mt-1 text-[10px] text-slate-500">{error}</p>
          </div>
        ) : samples.length < 2 ? (
          <div className="flex h-[128px] items-center justify-center text-xs text-slate-500">
            No elevation samples available.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="h-[128px] w-full cursor-crosshair select-none overflow-visible"
            role="img"
            aria-label="Lake Tahoe hiking trail elevation profile chart"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient
                id="tahoe-elev-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="rgb(255, 0, 0)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="rgb(255, 0, 0)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines & Y-axis elevation labels */}
            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={PAD_LEFT}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="rgba(148, 163, 184, 0.16)"
                  strokeDasharray="2 3"
                />
                <text
                  x={PAD_LEFT - 5}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[9px]"
                >
                  {Math.round(tick.value)}m
                </text>
              </g>
            ))}

            {/* X-axis distance labels */}
            <text
              x={PAD_LEFT}
              y={CHART_HEIGHT - 5}
              textAnchor="start"
              className="fill-slate-500 text-[9px]"
            >
              0 km
            </text>
            <text
              x={CHART_WIDTH - PAD_RIGHT}
              y={CHART_HEIGHT - 5}
              textAnchor="end"
              className="fill-slate-500 text-[9px]"
            >
              {metrics.totalDistanceKm.toFixed(1)} km
            </text>

            {/* Area fill + Bright red trail elevation curve */}
            <path d={areaPath} fill="url(#tahoe-elev-gradient)" />
            <path
              d={linePath}
              fill="none"
              stroke="rgb(255, 0, 0)"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Highlighted sample crosshair & dot */}
            {highlightedPoint && (
              <g>
                <line
                  x1={highlightedPoint.x}
                  x2={highlightedPoint.x}
                  y1={PAD_TOP}
                  y2={PAD_TOP + plotHeight}
                  stroke="rgba(248, 250, 252, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={highlightedPoint.x}
                  cy={highlightedPoint.y}
                  r="4"
                  fill="rgb(255, 0, 0)"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Invisible interactive hit columns for smooth scrubbing & click-to-fly */}
            {points.map((pt, idx) => {
              const colWidth = plotWidth / Math.max(points.length - 1, 1);
              return (
                <rect
                  key={pt.sample.index}
                  x={Math.max(PAD_LEFT, pt.x - colWidth / 2)}
                  y={PAD_TOP}
                  width={Math.max(colWidth, 6)}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onClick={() => onSelectSample(pt.sample)}
                />
              );
            })}
          </svg>
        )}

        {/* Active readout bar */}
        {highlightedPoint && (
          <div className="mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1 text-[10px] text-slate-300">
            <span>
              Point #{highlightedPoint.sample.index + 1} ·{' '}
              {highlightedPoint.sample.distanceKm.toFixed(2)} km
            </span>
            <span className="font-semibold text-red-400">
              {Math.round(highlightedPoint.sample.elevation)} m (
              {Math.round(highlightedPoint.sample.elevation * 3.28084)} ft) ·
              Click to fly
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
