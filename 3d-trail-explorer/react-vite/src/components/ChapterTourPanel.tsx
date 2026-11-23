import React from 'react';
import { Pause, Play, Route } from 'lucide-react';
import type { ChapterId, TrailChapter } from '../types/explorer';

interface ChapterTourPanelProps {
  chapters: TrailChapter[];
  activeChapterId: ChapterId;
  isAutoPlaying: boolean;
  onSelectChapter: (chapter: TrailChapter) => void;
  onToggleAutoPlay: () => void;
}

export const ChapterTourPanel: React.FC<ChapterTourPanelProps> = ({
  chapters,
  activeChapterId,
  isAutoPlaying,
  onSelectChapter,
  onToggleAutoPlay
}) => {
  return (
    <section
      data-testid="chapter-tour-panel"
      className="panel-card"
      aria-label="Guided 3D Camera Chapter Tour"
    >
      <div className="panel-header">
        <div className="panel-title-group">
          <Route size={15} className="panel-icon" />
          <h2 className="panel-title">Guided Camera Tour</h2>
        </div>

        <button
          type="button"
          data-testid="tour-autoplay-toggle"
          className={`autoplay-btn ${isAutoPlaying ? 'is-playing' : ''}`}
          onClick={onToggleAutoPlay}
          aria-pressed={isAutoPlaying}
        >
          {isAutoPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{isAutoPlaying ? 'Pause Tour' : 'Auto-Play Tour'}</span>
        </button>
      </div>

      <div className="chapter-list" role="list">
        {chapters.map((chapter) => {
          const isActive = chapter.id === activeChapterId;
          return (
            <button
              key={chapter.id}
              type="button"
              data-testid={chapter.testId}
              className={`chapter-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectChapter(chapter)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className="chapter-badge"
                style={{ backgroundColor: chapter.pinBackground }}
              >
                {chapter.stepNumber}
              </span>
              <span className="chapter-btn-copy">
                <span className="chapter-btn-title">{chapter.title}</span>
                <span className="chapter-btn-sub">{chapter.subtitle}</span>
              </span>
              <span className="chapter-camera-meta">
                {chapter.camera.tilt}° / {chapter.camera.heading}°
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
