'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Compass, Loader2, MapPin, Search, X } from 'lucide-react';
import type { AutocompletePrediction, PlaceSummary } from '@/types/explorer';

interface PlaceSearchBarProps {
  hasApiKey: boolean;
  onSelectPlace: (place: PlaceSummary) => void;
  isSearching: boolean;
  onTextSearch: (query: string) => Promise<void>;
}

interface PlaceSelectEvent extends Event {
  placePrediction?: google.maps.places.PlacePrediction;
}

export function PlaceSearchBar({
  hasApiKey,
  onSelectPlace,
  isSearching,
  onTextSearch,
}: PlaceSearchBarProps) {
  const placesLib = useMapsLibrary('places');
  const autocompleteHostRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const sessionTokenRef = useRef<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Imperatively mount Google Maps PlaceAutocompleteElement (<gmp-place-autocomplete>)
  // following CF8 (React JSX stringifies props on Web Components).
  useEffect(() => {
    const container = autocompleteHostRef.current;
    if (!placesLib || !container || !hasApiKey) return;

    let isMounted = true;
    const element = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: { lat: 38.9542, lng: -120.1103 },
        radius: 40000,
      },
      requestedLanguage: 'en',
      requestedRegion: 'us',
    });

    element.setAttribute('placeholder', 'Places Widget: jump to Tahoe POI...');
    element.setAttribute('aria-label', 'Google Places Autocomplete Widget');

    const handleSelect = async (event: Event) => {
      const selectEvent = event as PlaceSelectEvent;
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI',
          ],
        });

        if (!isMounted || !place.location) return;
        const loc = place.location.toJSON();
        onSelectPlace({
          id: place.id,
          displayName: place.displayName || 'Selected Landmark',
          formattedAddress: place.formattedAddress ?? undefined,
          location: { lat: loc.lat, lng: loc.lng },
          rating: place.rating ?? undefined,
          userRatingCount: place.userRatingCount ?? undefined,
          googleMapsUri: place.googleMapsURI ?? undefined,
          source: 'places-api',
        });
      } catch {
        // Ignore transient fetchFields cancellation
      }
    };

    element.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(element);
    setWidgetReady(true);

    return () => {
      isMounted = false;
      element.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
      setWidgetReady(false);
    };
  }, [placesLib, hasApiKey, onSelectPlace]);

  // Debounced BFF Autocomplete via /api/places/autocomplete
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !hasApiKey) {
      setPredictions([]);
      return;
    }

    if (!sessionTokenRef.current && typeof crypto !== 'undefined') {
      sessionTokenRef.current = crypto.randomUUID();
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: trimmed,
            sessionToken: sessionTokenRef.current ?? undefined,
          }),
        });
        if (!res.ok) {
          setPredictions([]);
          return;
        }
        const data = (await res.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string;
              text?: { text?: string };
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
            };
          }>;
        };

        const mapped: AutocompletePrediction[] = (data.suggestions ?? [])
          .map((item) => item.placePrediction)
          .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
          .slice(0, 5)
          .map((p) => ({
            placeId: p.placeId!,
            primaryText:
              p.structuredFormat?.mainText?.text || p.text?.text || 'Landmark',
            secondaryText: p.structuredFormat?.secondaryText?.text || '',
            fullText:
              p.text?.text ||
              p.structuredFormat?.mainText?.text ||
              'Lake Tahoe Landmark',
          }));

        setPredictions(mapped);
      } catch {
        setPredictions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [query, hasApiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    sessionTokenRef.current = null;
    await onTextSearch(trimmed);
  };

  const handlePickPrediction = async (prediction: AutocompletePrediction) => {
    setQuery(prediction.primaryText);
    setShowDropdown(false);
    setPredictions([]);
    sessionTokenRef.current = null;
    await onTextSearch(prediction.fullText);
  };

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
      {/* Primary Landmark Search Input + BFF Places API (New) Autocomplete & Text Search */}
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-1 items-center min-w-[220px] max-w-md"
      >
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            setShowDropdown(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              setShowDropdown(false);
            }, 180);
          }}
          placeholder="Search Lake Tahoe landmark (e.g. Vikingsholm)..."
          aria-label="Search Lake Tahoe landmark"
          data-testid="landmark-search-input"
          className="w-full rounded-l-lg border border-slate-700/80 bg-slate-900/90 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:border-red-500/80 focus:outline-none focus:ring-1 focus:ring-red-500/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setPredictions([]);
            }}
            aria-label="Clear search"
            className="absolute right-[78px] rounded p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          data-testid="landmark-search-submit"
          className="inline-flex items-center gap-1.5 rounded-r-lg border border-l-0 border-red-500/70 bg-red-600 px-3 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Compass className="h-3.5 w-3.5" />
          )}
          <span>Fly To</span>
        </button>

        {showDropdown && (predictions.length > 0 || isLoadingSuggestions) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-slate-700/90 bg-slate-900/95 shadow-2xl backdrop-blur-md">
            {isLoadingSuggestions && predictions.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                <span>Searching Places API (New)...</span>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/80">
                {predictions.map((pred) => (
                  <li key={pred.placeId}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePickPrediction(pred)}
                      className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-slate-800/90"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-100">
                          {pred.primaryText}
                        </div>
                        {pred.secondaryText && (
                          <div className="truncate text-[11px] text-slate-400">
                            {pred.secondaryText}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>

      {/* Imperatively mounted PlaceAutocompleteElement (<gmp-place-autocomplete>) */}
      <div
        ref={autocompleteHostRef}
        className={
          widgetReady
            ? 'hidden xl:block w-[235px] shrink-0'
            : 'hidden'
        }
      />
    </div>
  );
}
