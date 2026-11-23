'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mountain, TrendingUp, AlertCircle } from 'lucide-react';
import type { ElevationProfileSummary, TravelMode } from '@/types/travel';

interface ElevationProfileChartProps {
  profile: ElevationProfileSummary | null;
  isLoading: boolean;
  error: string | null;
  activeMode: TravelMode;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

const MODE_LABEL: Record<TravelMode, string> = {
  DRIVE: 'Driving',
  BICYCLE: 'Cycling',
  WALK: 'Walking',
  TRANSIT: 'Transit',
};

export default function ElevationProfileChart({
  profile,
  isLoading,
  error,
  activeMode,
  hoveredIndex,
  onHoverIndex,
}: ElevationProfileChartProps) {
  const chartBoxRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 780, height: 118 });

  useEffect(() => {
    const el = chartBoxRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const padding = { top: 12, right: 16, bottom: 22, left: 48 };
  const plotW = Math.max(120, size.width - padding.left - padding.right);
  const plotH = Math.max(60, size.height - padding.top - padding.bottom);

  const chartGeometry = useMemo(() => {
    if (!profile || profile.points.length < 2) return null;

    const pts = profile.points;
    const minFt = profile.minElevationMeters * 3.28084;
    const maxFt = profile.maxElevationMeters * 3.28084;
    const spanFt = Math.max(25, maxFt - minFt);
    const yMin = minFt - spanFt * 0.1;
    const yMax = maxFt + spanFt * 0.12;
    const ySpan = yMax - yMin;

    const totalDist = Math.max(1, profile.totalDistanceMeters);

    const coords = pts.map((pt) => {
      const elevFt = pt.elevationFeet;
      const x = padding.left + (pt.distanceMeters / totalDist) * plotW;
      const y = padding.top + (1 - (elevFt - yMin) / ySpan) * plotH;
      return { x, y, pt };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    const baselineY = padding.top + plotH;
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

    const yTicks = [0, 0.5, 1].map((frac) => {
      const valFt = yMin + frac * ySpan;
      const y = padding.top + (1 - frac) * plotH;
      return { y, label: `${Math.round(valFt).toLocaleString()} ft` };
    });

    const totalMiles = totalDist / 1609.344;
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      x: padding.left + frac * plotW,
      label: `${(totalMiles * frac).toFixed(1)} mi`,
    }));

    return { coords, linePath, areaPath, yTicks, xTicks };
  }, [profile, plotW, plotH, padding.left, padding.top]);

  const handlePointerMove = (clientX: number) => {
    const el = chartBoxRef.current;
    if (!el || !profile || profile.points.length < 2) return;
    const rect = el.getBoundingClientRect();
    const relX = clientX - rect.left - padding.left;
    const ratio = Math.min(1, Math.max(0, relX / plotW));
    const idx = Math.round(ratio * (profile.points.length - 1));
    onHoverIndex(idx);
  };

  const activePoint =
    profile && hoveredIndex !== null && profile.points[hoveredIndex]
      ? profile.points[hoveredIndex]
      : null;

  const activeCoord =
    chartGeometry && hoveredIndex !== null && chartGeometry.coords[hoveredIndex]
      ? chartGeometry.coords[hoveredIndex]
      : null;

  return (
    <section
      aria-label="Elevation and slope profile"
      className="flex h-[210px] shrink-0 flex-col border-t border-slate-200 bg-white px-4 py-2.5"
    >
      {/* Header & Metrics Row */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Mountain className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Elevation &amp; Slope Profile
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {MODE_LABEL[activeMode]} Route
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
          {profile && (
            <>
              <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-200/70">
                <TrendingUp className="h-3 w-3" />
                <span>
                  +{Math.round(profile.totalGainMeters * 3.28084).toLocaleString()} ft gain
                </span>
                <span className="text-emerald-600 font-normal">
                  ({Math.round(profile.totalGainMeters)} m)
                </span>
              </div>
              <div className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                Max Grade:{' '}
                <span className="font-semibold text-slate-900">
                  {Math.abs(profile.maxGradePercent).toFixed(1)}%
                </span>
              </div>
              <div className="hidden sm:block rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                Range:{' '}
                <span className="font-semibold text-slate-900">
                  {Math.round(profile.minElevationMeters * 3.28084).toLocaleString()}–
                  {Math.round(profile.maxElevationMeters * 3.28084).toLocaleString()} ft
                </span>
              </div>
            </>
          )}

          <div
            id="elevation-hover-readout"
            data-testid="elevation-hover-readout"
            className={`rounded-md px-2.5 py-0.5 font-mono text-[11px] font-medium border ${
              activePoint
                ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            {activePoint
              ? `${(activePoint.distanceMeters / 1609.344).toFixed(1)} mi · ${Math.round(
                  activePoint.elevationFeet
                ).toLocaleString()} ft (${Math.round(activePoint.elevationMeters)} m) · ${
                  activePoint.gradePercent >= 0 ? '+' : ''
                }${activePoint.gradePercent.toFixed(1)}% slope`
              : 'Hover chart or route to inspect altitude & slope'}
          </div>
        </div>
      </div>

      {/* Interactive SVG Area Chart */}
      <div
        ref={chartBoxRef}
        id="elevation-profile-chart"
        data-testid="elevation-profile-chart"
        className="relative flex-1 w-full select-none overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/70"
        onMouseMove={(e) => handlePointerMove(e.clientX)}
        onMouseLeave={() => onHoverIndex(null)}
        onTouchMove={(e) => {
          if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
        }}
        onTouchEnd={() => onHoverIndex(null)}
      >
        {isLoading && (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-500">
            Sampling 64 elevation points via Elevation API...
          </div>
        )}

        {!isLoading && error && (
          <div className="flex h-full w-full items-center justify-center gap-2 px-4 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && chartGeometry && (
          <svg
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            className="block h-full w-full cursor-crosshair"
            role="img"
            aria-label="Route elevation profile chart"
          >
            <defs>
              <linearGradient id="elevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Horizontal elevation gridlines */}
            {chartGeometry.yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={padding.left + plotW}
                  y2={tick.y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Distance ticks */}
            {chartGeometry.xTicks.map((tick, i) => (
              <text
                key={i}
                x={tick.x}
                y={size.height - 5}
                textAnchor={
                  i === 0 ? 'start' : i === chartGeometry.xTicks.length - 1 ? 'end' : 'middle'
                }
                className="fill-slate-500 font-mono text-[10px]"
              >
                {tick.label}
              </text>
            ))}

            {/* Elevation area & curve */}
            <path d={chartGeometry.areaPath} fill="url(#elevAreaGrad)" />
            <path
              d={chartGeometry.linePath}
              fill="none"
              stroke="#0f766e"
              strokeWidth={2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Active hover crosshair & point */}
            {activeCoord && (
              <g>
                <line
                  x1={activeCoord.x}
                  y1={padding.top}
                  x2={activeCoord.x}
                  y2={padding.top + plotH}
                  stroke="#d97706"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r={5}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>
        )}

        {!isLoading && !error && !chartGeometry && (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            Select a route to inspect its elevation and slope profile.
          </div>
        )}
      </div>
    </section>
  );
}
