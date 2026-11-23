'use client';

import React from 'react';
import { ExternalLink, MapPin, Mountain, Star } from 'lucide-react';
import type { ChapterStop, PlaceSummary } from '@/types/explorer';

interface ViewpointDetailCardProps {
  activeChapter: ChapterStop | null;
  selectedPlace: PlaceSummary | null;
  isLoadingPlace: boolean;
}

export function ViewpointDetailCard({
  activeChapter,
  selectedPlace,
  isLoadingPlace,
}: ViewpointDetailCardProps) {
  const title =
    selectedPlace?.displayName ||
    activeChapter?.shortTitle ||
    'Emerald Bay State Park';
  const subtitle =
    selectedPlace?.formattedAddress ||
    activeChapter?.subtitle ||
    'Lake Tahoe, California';

  const elevationM = selectedPlace?.elevationMeters;
  const elevationFt =
    elevationM !== undefined ? Math.round(elevationM * 3.28084) : null;

  return (
    <section
      data-testid="selected-viewpoint-card"
      className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>
              {selectedPlace?.source === 'places-api'
                ? 'Live Places API (New)'
                : activeChapter
                  ? `Chapter ${activeChapter.order} Focus`
                  : 'Active Viewpoint'}
            </span>
          </div>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-white">
            {title}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
            {isLoadingPlace ? 'Fetching live Places & Elevation data...' : subtitle}
          </p>
        </div>

        {selectedPlace?.rating !== undefined && (
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{selectedPlace.rating.toFixed(1)}</span>
            {selectedPlace.userRatingCount !== undefined && (
              <span className="text-[10px] font-normal text-amber-200/70">
                ({selectedPlace.userRatingCount.toLocaleString()})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Mountain className="h-3.5 w-3.5 text-emerald-400" />
          <span>
            {elevationM !== undefined
              ? `${Math.round(elevationM)} m (${elevationFt?.toLocaleString()} ft)`
              : activeChapter
                ? `${activeChapter.position.lat.toFixed(4)}, ${activeChapter.position.lng.toFixed(4)}`
                : 'Lake Tahoe Basin'}
          </span>
        </div>

        {selectedPlace?.googleMapsUri && (
          <a
            href={selectedPlace.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-sky-400 transition hover:text-sky-300"
          >
            <span>Open in Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
