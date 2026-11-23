'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Eye } from 'lucide-react';
import { PlaceItem } from '@/types/itinerary';

interface StreetViewPanelProps {
  selectedPlace: PlaceItem | null;
  hasApiKey: boolean;
}

export function StreetViewPanel({
  selectedPlace,
  hasApiKey,
}: StreetViewPanelProps) {
  const panoContainerRef = useRef<HTMLDivElement | null>(null);
  const streetViewLib = useMapsLibrary('streetView');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Select a hotel, restaurant, or attraction to preview Street View.'
  );
  const [hasPanorama, setHasPanorama] = useState<boolean>(false);

  useEffect(() => {
    const container = panoContainerRef.current;
    if (!container) return;

    if (!hasApiKey) {
      setHasPanorama(false);
      setStatusMessage(
        'Street View preview activates when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured.'
      );
      return;
    }

    if (!selectedPlace) {
      setHasPanorama(false);
      setStatusMessage(
        'Select any landmark, restaurant, or hotel to inspect Street View.'
      );
      return;
    }

    if (!streetViewLib) {
      setHasPanorama(false);
      setStatusMessage(`Loading Street View service for ${selectedPlace.displayName}…`);
      return;
    }

    let cancelled = false;
    setStatusMessage(`Searching Street View imagery near ${selectedPlace.displayName}…`);

    const service = new streetViewLib.StreetViewService();
    service
      .getPanorama({
        location: selectedPlace.location,
        radius: 150,
        preference: streetViewLib.StreetViewPreference.BEST,
      })
      .then((response) => {
        if (cancelled || !panoContainerRef.current) return;
        const panoId = response.data?.location?.pano;
        const panoLatLng = response.data?.location?.latLng ?? selectedPlace.location;

        panoContainerRef.current.replaceChildren();
        new streetViewLib.StreetViewPanorama(panoContainerRef.current, {
          pano: panoId,
          position: panoLatLng,
          pov: { heading: 25, pitch: 4 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true,
          linksControl: true,
          panControl: true,
          enableCloseButton: false,
        });

        setHasPanorama(true);
        setStatusMessage(
          response.data?.location?.description || selectedPlace.displayName
        );
      })
      .catch(() => {
        if (cancelled || !panoContainerRef.current) return;
        panoContainerRef.current.replaceChildren();
        setHasPanorama(false);
        setStatusMessage(
          `No outdoor Street View panorama found within 150m of ${selectedPlace.displayName}.`
        );
      });

    return () => {
      cancelled = true;
    };
  }, [hasApiKey, selectedPlace, streetViewLib]);

  return (
    <section
      data-testid="street-view-panel"
      className="street-view-panel"
      aria-label="Street View preview panel"
    >
      <div className="street-view-header">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Eye size={14} color="#5eead4" aria-hidden="true" />
          <span>
            Street View Preview
            {selectedPlace ? ` — ${selectedPlace.displayName}` : ''}
          </span>
        </span>
        <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 11 }}>
          {selectedPlace
            ? `${selectedPlace.location.lat.toFixed(4)}, ${selectedPlace.location.lng.toFixed(4)}`
            : 'No location selected'}
        </span>
      </div>

      <div className="street-view-canvas">
        <div
          ref={panoContainerRef}
          style={{ width: '100%', height: '100%' }}
        />
        {!hasPanorama && (
          <div className="street-view-empty">
            <p style={{ margin: 0 }}>{statusMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}
