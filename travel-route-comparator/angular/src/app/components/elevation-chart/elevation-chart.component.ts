import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ElevationProfileSummary,
  ElevationSamplePoint,
  TravelModeId,
} from '../../models/route-comparator.models';

interface ChartSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

@Component({
  selector: 'app-elevation-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="elevation-panel" aria-label="Elevation and slope profile">
      <div class="elevation-header">
        <div class="elevation-title-group">
          <span class="elevation-title">Elevation &amp; Slope Profile</span>
          <span class="mode-pill">{{ modeLabel() }}</span>
          @if (profile(); as prof) {
            <div class="elevation-stats">
              <span class="stat-badge gain">
                ↗ +{{ prof.totalGainM }} m (+{{ prof.totalGainFt }} ft)
              </span>
              <span class="stat-badge loss">↘ -{{ prof.totalLossM }} m</span>
              <span class="stat-badge range">
                ⛰ {{ prof.minElevationM }}–{{ prof.maxElevationM }} m
              </span>
              <span class="stat-badge grade">
                Max {{ prof.maxGradePct }}% grade
              </span>
            </div>
          }
        </div>

        <div
          id="elevation-hover-readout"
          data-testid="elevation-hover-readout"
          class="hover-readout"
        >
          @if (hoveredSample(); as point) {
            <span class="readout-active">
              <strong>{{ point.distanceKm.toFixed(1) }} km</strong>
              ({{ point.distanceMi.toFixed(1) }} mi) ·
              <strong>{{ Math.round(point.elevationM) }} m</strong>
              ({{ point.elevationFt }} ft) ·
              <span [style.color]="gradeColor(point.gradePct)">
                {{ point.gradePct >= 0 ? '+' : '' }}{{ point.gradePct.toFixed(1) }}% grade
              </span>
            </span>
          } @else {
            <span class="readout-hint">
              Hover chart to scrub elevation &amp; sync map marker
            </span>
          }
        </div>
      </div>

      <div class="chart-stage">
        @if (loading()) {
          <div class="chart-placeholder">
            Sampling Elevation API profile along route path…
          </div>
        } @else if (errorMessage()) {
          <div class="chart-placeholder error">{{ errorMessage() }}</div>
        } @else if (profile(); as prof) {
          <div
            id="elevation-profile-chart"
            data-testid="elevation-profile-chart"
            class="svg-container"
            (mousemove)="onMouseMove($event, prof)"
            (mouseleave)="onMouseLeave()"
          >
            <svg
              viewBox="0 0 800 120"
              preserveAspectRatio="none"
              class="elevation-svg"
              role="img"
              aria-label="Route elevation profile chart"
            >
              <defs>
                <linearGradient id="elevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#059669" stop-opacity="0.32" />
                  <stop offset="100%" stop-color="#059669" stop-opacity="0.03" />
                </linearGradient>
              </defs>

              <!-- Horizontal Gridlines -->
              <line x1="0" y1="20" x2="800" y2="20" class="grid-line" />
              <line x1="0" y1="60" x2="800" y2="60" class="grid-line" />
              <line x1="0" y1="100" x2="800" y2="100" class="grid-line" />

              <!-- Filled Area -->
              <path [attr.d]="areaPath()" fill="url(#elevAreaGrad)" />

              <!-- Slope-colored segments -->
              @for (seg of segments(); track $index) {
                <line
                  [attr.x1]="seg.x1"
                  [attr.y1]="seg.y1"
                  [attr.x2]="seg.x2"
                  [attr.y2]="seg.y2"
                  [attr.stroke]="seg.color"
                  stroke-width="2.6"
                  stroke-linecap="round"
                />
              }

              <!-- Hover Crosshair -->
              @if (hoveredCoords(); as hc) {
                <line
                  [attr.x1]="hc.x"
                  y1="8"
                  [attr.x2]="hc.x"
                  y2="112"
                  stroke="#0f172a"
                  stroke-width="1.25"
                  stroke-dasharray="3 3"
                />
                <circle
                  [attr.cx]="hc.x"
                  [attr.cy]="hc.y"
                  r="5"
                  fill="#0f172a"
                  stroke="#ffffff"
                  stroke-width="2"
                />
              }
            </svg>

            <div class="axis-labels-y">
              <span>{{ prof.maxElevationM }} m</span>
              <span>{{ Math.round((prof.maxElevationM + prof.minElevationM) / 2) }} m</span>
              <span>{{ prof.minElevationM }} m</span>
            </div>

            <div class="axis-labels-x">
              <span>0 km</span>
              <span>{{ (prof.totalDistanceKm / 2).toFixed(1) }} km</span>
              <span>{{ prof.totalDistanceKm.toFixed(1) }} km</span>
            </div>

            <div class="slope-legend">
              <span><i class="swatch gentle"></i>&lt;3%</span>
              <span><i class="swatch mod"></i>3–6%</span>
              <span><i class="swatch steep"></i>&gt;6%</span>
            </div>
          </div>
        } @else {
          <div class="chart-placeholder">
            Select a route to inspect its elevation and slope profile.
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .elevation-panel {
        height: 210px;
        min-height: 210px;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        padding: 10px 16px 8px;
        gap: 8px;
      }

      .elevation-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .elevation-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .elevation-title {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
      }

      .mode-pill {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
      }

      .elevation-stats {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .stat-badge {
        font-size: 11.5px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 6px;
        background: #f1f5f9;
        color: #334155;
      }

      .stat-badge.gain {
        background: #ecfdf5;
        color: #065f46;
      }

      .stat-badge.loss {
        background: #fff1f2;
        color: #9f1239;
      }

      .hover-readout {
        font-size: 12px;
        color: #334155;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 4px 10px;
      }

      .readout-hint {
        color: #64748b;
      }

      .chart-stage {
        position: relative;
        flex: 1;
        min-height: 0;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }

      .svg-container {
        position: relative;
        width: 100%;
        height: 100%;
        cursor: crosshair;
      }

      .elevation-svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      .grid-line {
        stroke: #cbd5e1;
        stroke-width: 0.75;
        stroke-dasharray: 4 4;
      }

      .axis-labels-y {
        position: absolute;
        top: 6px;
        bottom: 18px;
        left: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 10px;
        font-weight: 600;
        color: #64748b;
        pointer-events: none;
      }

      .axis-labels-x {
        position: absolute;
        left: 44px;
        right: 90px;
        bottom: 2px;
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        font-weight: 600;
        color: #64748b;
        pointer-events: none;
      }

      .slope-legend {
        position: absolute;
        right: 8px;
        bottom: 3px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        font-weight: 600;
        color: #475569;
        background: rgba(255, 255, 255, 0.86);
        padding: 1px 6px;
        border-radius: 6px;
        pointer-events: none;
      }

      .slope-legend span {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }

      .swatch {
        display: inline-block;
        width: 8px;
        height: 3px;
        border-radius: 2px;
      }

      .swatch.gentle {
        background: #059669;
      }

      .swatch.mod {
        background: #d97706;
      }

      .swatch.steep {
        background: #dc2626;
      }

      .chart-placeholder {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: #64748b;
      }

      .chart-placeholder.error {
        color: #b91c1c;
      }
    `,
  ],
})
export class ElevationChartComponent {
  readonly profile = input<ElevationProfileSummary | null>(null);
  readonly loading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly activeMode = input<TravelModeId>('BICYCLING');

  readonly hoverPointChange = output<ElevationSamplePoint | null>();

  protected readonly Math = Math;
  readonly hoveredIndex = signal<number | null>(null);

  readonly modeLabel = computed(() => {
    switch (this.activeMode()) {
      case 'BICYCLING':
        return 'Cycling Trail / Road';
      case 'WALKING':
        return 'Walking Path';
      case 'TRANSIT':
        return 'Transit Corridor';
      case 'DRIVING':
      default:
        return 'Driving Corridor';
    }
  });

  readonly pointsCoords = computed(() => {
    const prof = this.profile();
    if (!prof || prof.samples.length < 2) {
      return [];
    }
    const minE = prof.minElevationM;
    const maxE = prof.maxElevationM;
    const span = Math.max(10, maxE - minE);
    const padTop = 14;
    const usableH = 92;
    const count = prof.samples.length;

    return prof.samples.map((s, idx) => {
      const x = (idx / (count - 1)) * 800;
      const norm = (s.elevationM - minE) / span;
      const y = padTop + usableH * (1 - norm);
      return { x, y, sample: s };
    });
  });

  readonly areaPath = computed(() => {
    const pts = this.pointsCoords();
    if (pts.length < 2) return '';
    const linePart = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    return `${linePart} L 800 116 L 0 116 Z`;
  });

  readonly segments = computed<ChartSegment[]>(() => {
    const pts = this.pointsCoords();
    const segs: ChartSegment[] = [];
    for (let i = 1; i < pts.length; i += 1) {
      const p1 = pts[i - 1];
      const p2 = pts[i];
      segs.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        color: this.gradeColor(p2.sample.gradePct),
      });
    }
    return segs;
  });

  readonly hoveredSample = computed(() => {
    const idx = this.hoveredIndex();
    const prof = this.profile();
    if (idx === null || !prof) return null;
    return prof.samples[idx] ?? null;
  });

  readonly hoveredCoords = computed(() => {
    const idx = this.hoveredIndex();
    const pts = this.pointsCoords();
    if (idx === null || !pts[idx]) return null;
    return pts[idx];
  });

  gradeColor(gradePct: number): string {
    const abs = Math.abs(gradePct);
    if (abs >= 6) return '#dc2626';
    if (abs >= 3) return '#d97706';
    return '#059669';
  }

  onMouseMove(event: MouseEvent, prof: ElevationProfileSummary): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target || !prof.samples.length) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))
    );
    const idx = Math.round(ratio * (prof.samples.length - 1));
    this.hoveredIndex.set(idx);
    this.hoverPointChange.emit(prof.samples[idx] ?? null);
  }

  onMouseLeave(): void {
    this.hoveredIndex.set(null);
    this.hoverPointChange.emit(null);
  }
}
