import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TimeZoneInfo } from '../../models/itinerary.models';
import { TimezoneService } from '../../services/timezone.service';

@Component({
  selector: 'app-timezone-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tz-pill" data-testid="timezone-hub" [title]="tooltipText()">
      <div class="tz-clock-row">
        <span class="tz-dot" aria-hidden="true"></span>
        <span class="tz-time">{{ timeText() }}</span>
        <span class="tz-offset">{{ timeZone().utcOffsetLabel }}</span>
      </div>
      <div class="tz-meta">
        <span>{{ destinationName() }}</span>
        <span aria-hidden="true">•</span>
        <span>{{ dateText() }}</span>
        <span aria-hidden="true">•</span>
        <span class="tz-name">{{ timeZone().timeZoneName }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .tz-pill {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        padding: 6px 12px;
        border-radius: 10px;
        background: #f0fdfa;
        border: 1px solid #99f6e4;
        min-width: 220px;
      }

      .tz-clock-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tz-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #0f766e;
        flex-shrink: 0;
      }

      .tz-time {
        font-family: 'JetBrains Mono', monospace;
        font-size: 15px;
        font-weight: 600;
        color: #0f172a;
        letter-spacing: 0.02em;
      }

      .tz-offset {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 999px;
        background: #0f766e;
        color: #ffffff;
      }

      .tz-meta {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        color: #475569;
        margin-top: 2px;
        max-width: 310px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tz-name {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (max-width: 768px) {
        .tz-pill {
          align-items: flex-start;
          min-width: auto;
        }
      }
    `,
  ],
})
export class TimezoneHubComponent {
  private readonly timezoneService = inject(TimezoneService);
  private readonly destroyRef = inject(DestroyRef);

  readonly destinationName = input.required<string>();
  readonly timeZone = input.required<TimeZoneInfo>();

  readonly timeText = signal('--:--:--');
  readonly dateText = signal('Loading...');

  constructor() {
    effect(() => {
      const tz = this.timeZone();
      this.updateClock(tz);
    });

    const intervalId = window.setInterval(() => {
      this.updateClock(this.timeZone());
    }, 1000);

    this.destroyRef.onDestroy(() => {
      window.clearInterval(intervalId);
    });
  }

  tooltipText(): string {
    const tz = this.timeZone();
    return `${tz.timeZoneId} (${tz.timeZoneName}) • ${tz.utcOffsetLabel}`;
  }

  private updateClock(tz: TimeZoneInfo): void {
    const { timeText, dateText } = this.timezoneService.formatLocalClock(tz);
    this.timeText.set(timeText);
    this.dateText.set(dateText);
  }
}
