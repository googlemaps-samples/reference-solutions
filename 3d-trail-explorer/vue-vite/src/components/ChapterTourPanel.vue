<script setup lang="ts">
import type { TourChapter } from '../types/explorer';

defineProps<{
  chapters: TourChapter[];
  activeChapterId: string;
  isAutoPlaying: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-chapter', chapter: TourChapter): void;
  (e: 'toggle-autoplay'): void;
}>();
</script>

<template>
  <section class="panel-card" data-testid="chapter-tour-panel" aria-label="Guided 3D Camera Tour">
    <div class="panel-header">
      <div>
        <span class="eyebrow">3D Camera Story Tour</span>
        <h2 class="panel-title">Scenic Chapters</h2>
      </div>
      <button
        type="button"
        class="autoplay-btn"
        :class="{ active: isAutoPlaying }"
        data-testid="tour-autoplay-toggle"
        :aria-pressed="isAutoPlaying"
        @click="emit('toggle-autoplay')"
      >
        <span class="autoplay-dot" aria-hidden="true"></span>
        {{ isAutoPlaying ? 'Pause Tour' : 'Auto-Play' }}
      </button>
    </div>

    <div class="chapter-list" role="list">
      <button
        v-for="chapter in chapters"
        :key="chapter.id"
        type="button"
        class="chapter-btn"
        :class="{ active: activeChapterId === chapter.id }"
        :data-testid="chapter.testId"
        :aria-current="activeChapterId === chapter.id ? 'step' : undefined"
        @click="emit('select-chapter', chapter)"
      >
        <span
          class="chapter-badge"
          :style="{ backgroundColor: chapter.markerColor }"
          aria-hidden="true"
        >
          {{ chapter.stepNumber }}
        </span>
        <span class="chapter-copy">
          <span class="chapter-name">{{ chapter.title }}</span>
          <span class="chapter-meta">
            Hdg {{ Math.round(chapter.camera.heading) }}° · Tilt {{ Math.round(chapter.camera.tilt) }}° · {{ (chapter.camera.range / 1000).toFixed(1) }} km
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.panel-card {
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  padding: 12px 14px;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.45);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f87171;
}

.panel-title {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.autoplay-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(30, 41, 59, 0.9);
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.autoplay-btn:hover {
  border-color: rgba(248, 113, 113, 0.65);
  background: rgba(51, 65, 85, 0.95);
}

.autoplay-btn.active {
  background: rgba(220, 38, 38, 0.22);
  border-color: #ef4444;
  color: #fecaca;
}

.autoplay-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
}

.autoplay-btn.active .autoplay-dot {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chapter-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(30, 41, 59, 0.52);
  color: #e2e8f0;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.chapter-btn:hover {
  transform: translateX(2px);
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(30, 41, 59, 0.88);
}

.chapter-btn.active {
  border-color: rgba(239, 68, 68, 0.85);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(30, 41, 59, 0.9));
  box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.25);
}

.chapter-badge {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #0f172a;
}

.chapter-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chapter-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-meta {
  font-size: 10.5px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}
</style>
