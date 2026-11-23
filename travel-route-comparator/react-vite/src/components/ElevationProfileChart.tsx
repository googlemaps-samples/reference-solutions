import { useCallback, useMemo, useRef } from 'react';
import { Mountain, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import type { ElevationPoint, ElevationProfileSummary, TravelModeId } from '../types/routing';

interface ElevationProfileChartProps {
  activeMode: TravelModeId;
  profile: ElevationProfileSummary | null;
  isLoading: boolean;
  error?: string;
  hoveredPoint: ElevationPoint | null;
  onHoverPointChange: (point: ElevationPoint | null) => void;
  onSwitchToCycling: () => void;
}

const SVG_WIDTH = 820;
const SVG_HEIGHT = 128;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;
const PAD_LEFT = 46;
const PAD_RIGHT = 16;

function gradeColor(grade: number): string {
  const abs = Math.abs(grade);
  if (abs >= 8) return '#dc2626';
  if (abs >= 5) return '#ea580c';
  if (abs >= 2.5) return '#d97706';
  return '#0f766e';
}

export function ElevationProfileChart({
  activeMode,
  profile,
  isLoading,
  error,
  hoveredPoint,
  onHoverPointChange,
  onSwitchToCycling,
}: ElevationProfileChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isTrailMode = activeMode === 'BICYCLING' || activeMode === 'WALKING';

  const chartGeometry = useMemo(() => {
    if (!profile || profile.points.length < 2) return null;

    const { points, minElevationMeters, maxElevationMeters } = profile;
    const minElev = Math.floor(minElevationMeters - 15);
    const maxElev = Math.ceil(maxElevationMeters + 20);
    const elevSpan = Math.max(10, maxElev - minElev);
    const maxDist = Math.max(0.01, points[points.length - 1].distanceMiles);

    const plotW = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotH = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const coords = points.map((pt) => {
      const x = PAD_LEFT + (pt.distanceMiles / maxDist) * plotW;
      const y =
        PAD_TOP + plotH - ((pt.elevationMeters - minElev) / elevSpan) * plotH;
      return { x, y, pt };
    });

    const linePath = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(
      PAD_TOP + plotH
    ).toFixed(1)} L${coords[0].x.toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} Z`;

    const midElev = Math.round((minElev + maxElev) / 2);

    return {
      coords,
      linePath,
      areaPath,
      minElev,
      midElev,
      maxElev,
      maxDist,
      plotW,
      plotH,
    };
  }, [profile]);

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!svgRef.current || !chartGeometry) return;
      const rect = svgRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const relX = ((clientX - rect.left) / rect.width) * SVG_WIDTH;
      const clampedX = Math.max(
        PAD_LEFT,
        Math.min(SVG_WIDTH - PAD_RIGHT, relX),
      );
      const ratio = (clampedX - PAD_LEFT) / chartGeometry.plotW;
      const targetIdx = Math.round(ratio * (chartGeometry.coords.length - 1));
      const match = chartGeometry.coords[targetIdx];
      if (match) {
        onHoverPointChange(match.pt);
      }
    },
    [chartGeometry, onHoverPointChange],
  );

  const activeCoord = useMemo(() => {
    if (!chartGeometry || !hoveredPoint) return null;
    return chartGeometry.coords[hoveredPoint.index] ?? null;
  }, [chartGeometry, hoveredPoint]);

  return (
    <section className="elevation-panel" aria-label="Route Elevation and Slope Profile">
      <div className="elevation-panel-header">
        <div className="elevation-title-group">
          <Mountain size={16} className="elevation-title-icon" />
          <h2 className="elevation-title">Elevation &amp; Slope Profile</h2>
          <span className="elevation-samples-pill">64 Elevation API Samples</span>
        </div>

        {isTrailMode && profile && (
          <div className="elevation-kpis">
            <span className="elev-kpi">
              <TrendingUp size={13} />
              Gain: <strong>+{Math.round(profile.totalGainMeters)} m</strong> (
              +{Math.round(profile.totalGainMeters * 3.28084)} ft)
            </span>
            <span className="elev-kpi">
              <TrendingDown size={13} />
              Loss: <strong>-{Math.round(profile.totalLossMeters)} m</strong>
            </span>
            <span className="elev-kpi">
              Peak: <strong>{Math.round(profile.maxElevationMeters)} m</strong>
            </span>
            <span className="elev-kpi">
              <Activity size={13} />
              Max Slope:{' '}
              <strong style={{ color: gradeColor(profile.maxGradePercent) }}>
                {profile.maxGradePercent >= 0 ? '+' : ''}
                {profile.maxGradePercent.toFixed(1)}%
              </strong>
            </span>
          </div>
        )}

        <div id="elevation-hover-readout" className="elevation-hover-readout">
          {hoveredPoint ? (
            <>
              <span>
                Mile <strong>{hoveredPoint.distanceMiles.toFixed(1)}</strong>
              </span>
              <span>
                Alt <strong>{Math.round(hoveredPoint.elevationMeters)} m</strong> (
                {Math.round(hoveredPoint.elevationFeet)} ft)
              </span>
              <span
                className="readout-grade"
                style={{ color: gradeColor(hoveredPoint.gradePercent) }}
              >
                {hoveredPoint.gradePercent >= 0 ? '+' : ''}
                {hoveredPoint.gradePercent.toFixed(1)}% grade
              </span>
            </>
          ) : isTrailMode && profile ? (
            <span className="readout-hint">Hover chart to scrub map marker</span>
          ) : null}
        </div>
      </div>

      <div className="elevation-body">
        {!isTrailMode ? (
          <div className="elevation-empty-state">
            <p>
              Elevation &amp; slope profiling is displayed for{' '}
              <strong>Cycling</strong> and <strong>Walking</strong> routes along the
              Denver–Boulder corridor.
            </p>
            <button
              type="button"
              className="switch-trail-btn"
              onClick={onSwitchToCycling}
            >
              Switch to Cycling Elevation Profile
            </button>
          </div>
        ) : isLoading ? (
          <div className="elevation-empty-state">
            <p>Sampling route elevation profile via Elevation API...</p>
          </div>
        ) : error ? (
          <div className="elevation-empty-state elevation-error">
            <p>{error}</p>
          </div>
        ) : !chartGeometry ? (
          <div className="elevation-empty-state">
            <p>Select or compute a cycling or walking route to inspect elevation.</p>
          </div>
        ) : (
          <svg
            id="elevation-profile-chart"
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            preserveAspectRatio="none"
            className="elevation-svg"
            onMouseMove={(e) => handlePointerMove(e.clientX)}
            onMouseLeave={() => onHoverPointChange(null)}
            onTouchMove={(e) => {
              if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
            }}
            onTouchEnd={() => onHoverPointChange(null)}
          >
            <defs>
              <linearGradient id="elevAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Horizontal elevation gridlines */}
            {[
              { y: PAD_TOP, label: `${chartGeometry.maxElev}m` },
              {
                y: PAD_TOP + chartGeometry.plotH / 2,
                label: `${chartGeometry.midElev}m`,
              },
              {
                y: PAD_TOP + chartGeometry.plotH,
                label: `${chartGeometry.minElev}m`,
              },
            ].map((tick) => (
              <g key={tick.label}>
                <line
                  x1={PAD_LEFT}
                  y1={tick.y}
                  x2={SVG_WIDTH - PAD_RIGHT}
                  y2={tick.y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 6}
                  y={tick.y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Distance axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const x = PAD_LEFT + frac * chartGeometry.plotW;
              const miles = (frac * chartGeometry.maxDist).toFixed(1);
              return (
                <text
                  key={frac}
                  x={x}
                  y={SVG_HEIGHT - 5}
                  textAnchor={frac === 0 ? 'start' : frac === 1 ? 'end' : 'middle'}
                  fontSize="10"
                  fill="#64748b"
                >
                  {miles} mi
                </text>
              );
            })}

            {/* Elevation area & line */}
            <path d={chartGeometry.areaPath} fill="url(#elevAreaGradient)" />
            <path
              d={chartGeometry.linePath}
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />

            {/* Synchronized hover crosshair & dot */}
            {activeCoord && (
              <g>
                <line
                  x1={activeCoord.x}
                  y1={PAD_TOP}
                  x2={activeCoord.x}
                  y2={PAD_TOP + chartGeometry.plotH}
                  stroke="#0f172a"
                  strokeWidth="1.25"
                  strokeDasharray="3 2"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="5"
                  fill={gradeColor(activeCoord.pt.gradePercent)}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        )}
      </div>
    </section>
  );
}
