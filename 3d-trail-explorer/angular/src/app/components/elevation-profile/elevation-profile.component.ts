import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ElevationSample, TrailMetrics } from '../../data/tahoe-trail.data';

interface ChartPoint {
  x: number;
  y: number;
  sample: ElevationSample;
}

@Component({
  selector: 'app-elevation-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel-section" data-testid="elevation-profile-panel">
      <div class="section-header">
        <div>
          <span class="eyebrow">Elevation API · Live Path Profile</span>
          <h2>Rubicon Trail Elevation</h2>
        </div>
        @if (activeSample) {
          <span class="sample-pill">
            {{ activeSample.elevationMeters | number: '1.0-0' }} m ·
            {{ activeSample.distanceKm | number: '1.2-2' }} km
          </span>
        }
      </div>

      <div class="metrics-grid" data-testid="trail-metrics-summary">
        <div class="metric-card">
          <span class="metric-label">Distance</span>
          <span class="metric-value">
            {{
              metrics
                ? (metrics.totalDistanceKm | number: '1.2-2') + ' km'
                : '—'
            }}
          </span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Peak</span>
          <span class="metric-value">
            {{
              metrics
                ? (metrics.maxElevationMeters | number: '1.0-0') + ' m'
                : '—'
            }}
          </span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Gain</span>
          <span class="metric-value gain">
            {{
              metrics
                ? '+' + (metrics.totalAscentMeters | number: '1.0-0') + ' m'
                : '—'
            }}
          </span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Loss</span>
          <span class="metric-value loss">
            {{
              metrics
                ? '-' + (metrics.totalDescentMeters | number: '1.0-0') + ' m'
                : '—'
            }}
          </span>
        </div>
      </div>

      <div class="chart-wrapper">
        @if (loading) {
          <div class="chart-status">Sampling live Elevation API profile…</div>
        } @else if (errorMessage) {
          <div class="chart-status warn">{{ errorMessage }}</div>
        }

        <svg
          class="elevation-svg"
          data-testid="elevation-profile-chart"
          viewBox="0 0 320 116"
          preserveAspectRatio="none"
          role="img"
          aria-label="Trail elevation profile chart"
          (mousemove)="onSvgMouseMove($event)"
          (mouseleave)="onSvgMouseLeave()"
          (click)="onSvgClick($event)"
        >
          <defs>
            <linearGradient id="tahoeElevFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ef4444" stop-opacity="0.52" />
              <stop offset="100%" stop-color="#ef4444" stop-opacity="0.03" />
            </linearGradient>
          </defs>

          <!-- Baseline grid -->
          <line x1="8" y1="20" x2="312" y2="20" class="grid-line" />
          <line x1="8" y1="56" x2="312" y2="56" class="grid-line" />
          <line x1="8" y1="92" x2="312" y2="92" class="grid-line" />

          @if (areaPath) {
            <path [attr.d]="areaPath" fill="url(#tahoeElevFill)" />
          }
          @if (linePath) {
            <path [attr.d]="linePath" class="profile-line" />
          }

          @if (hoveredPoint) {
            <line
              [attr.x1]="hoveredPoint.x"
              y1="10"
              [attr.x2]="hoveredPoint.x"
              y2="96"
              class="crosshair-line"
            />
            <circle
              [attr.cx]="hoveredPoint.x"
              [attr.cy]="hoveredPoint.y"
              r="4.5"
              class="crosshair-dot"
            />
          }

          @if (chartPoints.length > 0 && metrics) {
            <text x="10" y="109" class="axis-label">0.0 km</text>
            <text x="160" y="109" text-anchor="middle" class="axis-label">
              {{ metrics.minElevationMeters | number: '1.0-0' }}–{{
                metrics.maxElevationMeters | number: '1.0-0'
              }} m
            </text>
            <text x="310" y="109" text-anchor="end" class="axis-label">
              {{ metrics.totalDistanceKm | number: '1.1-1' }} km
            </text>
          }
        </svg>
      </div>
    </section>
  `,
  styles: [
    `
      .panel-section {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .eyebrow {
        display: block;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #38bdf8;
      }

      h2 {
        margin: 2px 0 0;
        font-size: 14px;
        font-weight: 600;
        color: #f8fafc;
      }

      .sample-pill {
        font-size: 11px;
        font-weight: 600;
        color: #fecaca;
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.45);
        border-radius: 999px;
        padding: 3px 8px;
        white-space: nowrap;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
      }

      .metric-card {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        padding: 6px 7px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .metric-label {
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #94a3b8;
      }

      .metric-value {
        font-size: 12px;
        font-weight: 700;
        color: #f8fafc;
      }

      .metric-value.gain {
        color: #34d399;
      }

      .metric-value.loss {
        color: #f87171;
      }

      .chart-wrapper {
        position: relative;
        background: rgba(8, 13, 24, 0.86);
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 10px;
        padding: 6px;
      }

      .elevation-svg {
        width: 100%;
        height: 112px;
        display: block;
        cursor: crosshair;
      }

      .grid-line {
        stroke: rgba(148, 163, 184, 0.14);
        stroke-dasharray: 3 3;
        stroke-width: 1;
      }

      .profile-line {
        fill: none;
        stroke: #ff2b2b;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .crosshair-line {
        stroke: rgba(56, 189, 248, 0.7);
        stroke-width: 1.2;
        stroke-dasharray: 2 2;
      }

      .crosshair-dot {
        fill: #38bdf8;
        stroke: #ffffff;
        stroke-width: 1.5;
      }

      .axis-label {
        font-size: 9px;
        fill: #94a3b8;
        font-weight: 500;
      }

      .chart-status {
        position: absolute;
        inset: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 8px;
        font-size: 11.5px;
        color: #cbd5e1;
        background: rgba(15, 23, 42, 0.72);
        border-radius: 8px;
        pointer-events: none;
      }

      .chart-status.warn {
        color: #fde68a;
      }
    `,
  ],
})
export class ElevationProfileComponent implements OnChanges {
  @Input() samples: ElevationSample[] = [];
  @Input() metrics: TrailMetrics | null = null;
  @Input() loading = false;
  @Input() errorMessage: string | null = null;

  @Output() hoverSample = new EventEmitter<ElevationSample | null>();
  @Output() selectSample = new EventEmitter<ElevationSample>();

  chartPoints: ChartPoint[] = [];
  linePath = '';
  areaPath = '';
  hoveredPoint: ChartPoint | null = null;

  get activeSample(): ElevationSample | null {
    if (this.hoveredPoint) {
      return this.hoveredPoint.sample;
    }
    return this.samples.length > 0 ? this.samples[0] : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['samples'] || changes['metrics']) {
      this.rebuildSvgPaths();
    }
  }

  private rebuildSvgPaths(): void {
    if (!this.samples.length) {
      this.chartPoints = [];
      this.linePath = '';
      this.areaPath = '';
      this.hoveredPoint = null;
      return;
    }

    const padX = 8;
    const width = 304;
    const topY = 14;
    const bottomY = 92;
    const height = bottomY - topY;

    const minElev =
      this.metrics?.minElevationMeters ??
      Math.min(...this.samples.map((s) => s.elevationMeters));
    const maxElev =
      this.metrics?.maxElevationMeters ??
      Math.max(...this.samples.map((s) => s.elevationMeters));
    const elevSpan = Math.max(maxElev - minElev, 1);

    const points: ChartPoint[] = this.samples.map((sample, i) => {
      const x =
        this.samples.length === 1
          ? padX + width / 2
          : padX + (i / (this.samples.length - 1)) * width;
      const ratio = (sample.elevationMeters - minElev) / elevSpan;
      const y = bottomY - ratio * height;
      return { x, y, sample };
    });

    this.chartPoints = points;
    this.linePath = points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
    this.areaPath = `${this.linePath} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;
  }

  onSvgMouseMove(event: MouseEvent): void {
    const point = this.findNearestPoint(event);
    this.hoveredPoint = point;
    this.hoverSample.emit(point ? point.sample : null);
  }

  onSvgMouseLeave(): void {
    this.hoveredPoint = null;
    this.hoverSample.emit(null);
  }

  onSvgClick(event: MouseEvent): void {
    const point = this.findNearestPoint(event);
    if (point) {
      this.hoveredPoint = point;
      this.selectSample.emit(point.sample);
    }
  }

  private findNearestPoint(event: MouseEvent): ChartPoint | null {
    if (!this.chartPoints.length) return null;
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return null;
    const relX = ((event.clientX - rect.left) / rect.width) * 320;

    let nearest = this.chartPoints[0];
    let minDist = Math.abs(nearest.x - relX);
    for (const pt of this.chartPoints) {
      const dist = Math.abs(pt.x - relX);
      if (dist < minDist) {
        minDist = dist;
        nearest = pt;
      }
    }
    return nearest;
  }
}
