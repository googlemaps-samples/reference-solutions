import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TourChapter } from '../../data/tahoe-trail.data';

@Component({
  selector: 'app-chapter-tour',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel-section" data-testid="chapter-tour-panel">
      <div class="section-header">
        <div>
          <span class="eyebrow">Guided 3D Camera Tour</span>
          <h2>Emerald Bay Story Chapters</h2>
        </div>
        <button
          type="button"
          class="autoplay-btn"
          [class.active]="isAutoPlaying"
          data-testid="tour-autoplay-toggle"
          (click)="toggleAutoPlay.emit()"
        >
          <span class="dot" [class.pulsing]="isAutoPlaying"></span>
          {{ isAutoPlaying ? 'Pause Tour' : 'Auto-Play' }}
        </button>
      </div>

      <div class="chapter-list">
        @for (chapter of chapters; track chapter.id) {
          <button
            type="button"
            class="chapter-btn"
            [class.selected]="chapter.id === activeChapterId"
            [attr.data-testid]="chapter.testId"
            (click)="selectChapter.emit(chapter)"
          >
            <div class="chapter-main">
              <span class="chapter-title">{{ chapter.title }}</span>
              <span class="chapter-sub">{{ chapter.subtitle }}</span>
            </div>
            <span class="chapter-meta">
              {{ chapter.camera.tilt }}° tilt · {{ chapter.camera.range }}m
            </span>
          </button>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .panel-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
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

      .autoplay-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 11px;
        border-radius: 999px;
        border: 1px solid rgba(56, 189, 248, 0.38);
        background: rgba(14, 116, 144, 0.2);
        color: #e0f2fe;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.18s ease;
        white-space: nowrap;
      }

      .autoplay-btn:hover {
        background: rgba(56, 189, 248, 0.25);
        border-color: rgba(56, 189, 248, 0.7);
      }

      .autoplay-btn.active {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.75);
        color: #fee2e2;
      }

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #38bdf8;
      }

      .dot.pulsing {
        background: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
      }

      .chapter-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .chapter-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        text-align: left;
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        background: rgba(15, 23, 42, 0.65);
        color: #e2e8f0;
        cursor: pointer;
        transition: all 0.16s ease;
      }

      .chapter-btn:hover {
        background: rgba(30, 41, 59, 0.85);
        border-color: rgba(148, 163, 184, 0.38);
        transform: translateY(-1px);
      }

      .chapter-btn.selected {
        background: linear-gradient(
          135deg,
          rgba(239, 68, 68, 0.22),
          rgba(30, 41, 59, 0.92)
        );
        border-color: rgba(239, 68, 68, 0.68);
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.16);
      }

      .chapter-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .chapter-title {
        font-size: 12.5px;
        font-weight: 600;
        color: #f8fafc;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chapter-sub {
        font-size: 11px;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chapter-meta {
        font-size: 10.5px;
        font-weight: 500;
        color: #cbd5e1;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid rgba(148, 163, 184, 0.16);
        padding: 3px 7px;
        border-radius: 6px;
        white-space: nowrap;
        flex-shrink: 0;
      }
    `,
  ],
})
export class ChapterTourComponent {
  @Input({ required: true }) chapters: TourChapter[] = [];
  @Input() activeChapterId: string | null = null;
  @Input() isAutoPlaying = false;

  @Output() selectChapter = new EventEmitter<TourChapter>();
  @Output() toggleAutoPlay = new EventEmitter<void>();
}
