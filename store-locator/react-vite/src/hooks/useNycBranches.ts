import { useCallback, useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { NYC_CENTER, type BranchLocation } from '../types/locator';
import { mapPlaceToBranch, type SeedCategory } from '../utils/placesHelpers';

const SEED_SEARCHES: Array<{
  category: SeedCategory;
  textQuery: string;
  locationBias: google.maps.CircleLiteral;
  maxResultCount: number;
}> = [
  {
    category: 'flagship',
    textQuery: 'flagship retail department store Manhattan New York',
    locationBias: { center: NYC_CENTER, radius: 6500 },
    maxResultCount: 9,
  },
  {
    category: 'kiosk',
    textQuery: 'espresso coffee kiosk Manhattan New York',
    locationBias: { center: { lat: 40.748, lng: -73.988 }, radius: 6500 },
    maxResultCount: 9,
  },
  {
    category: 'atm',
    textQuery: '24 hour ATM Manhattan New York',
    locationBias: { center: { lat: 40.758, lng: -73.982 }, radius: 6500 },
    maxResultCount: 9,
  },
];

const PLACE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'primaryType',
  'rating',
  'userRatingCount',
  'regularOpeningHours',
  'businessStatus',
];

export function useNycBranches() {
  const placesLibrary = useMapsLibrary('places');
  const [branches, setBranches] = useState<BranchLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    if (!placesLibrary) return;

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        SEED_SEARCHES.map(async (seed) => {
          const { places } = await placesLibrary.Place.searchByText({
            textQuery: seed.textQuery,
            fields: PLACE_FIELDS,
            locationBias: seed.locationBias,
            maxResultCount: seed.maxResultCount,
            language: 'en-US',
            region: 'us',
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
          });
          return { category: seed.category, places };
        })
      );

      const seenById: Record<string, BranchLocation> = {};
      const merged: BranchLocation[] = [];

      for (const group of results) {
        for (const place of group.places) {
          const mapped = mapPlaceToBranch(place, group.category);
          if (!mapped) continue;
          if (!seenById[mapped.id]) {
            seenById[mapped.id] = mapped;
            merged.push(mapped);
          }
        }
      }

      setBranches(merged);
      if (merged.length === 0) {
        setError('No NYC branch locations were returned by Places API.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load NYC locations.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [placesLibrary]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  return { branches, loading, error, reload: loadBranches };
}
