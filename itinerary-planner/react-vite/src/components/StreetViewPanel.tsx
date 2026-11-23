import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Compass } from 'lucide-react';
import type { PlaceItem } from '../types/itinerary';

interface StreetViewPanelProps {
  inspectedPlace: PlaceItem | null;
}

export function StreetViewPanel({ inspectedPlace }: StreetViewPanelProps) {
  const streetViewLib = useMapsLibrary('streetView');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const serviceRef = useRef<google.maps.StreetViewService | null>(null);

  const [statusMessage, setStatusMessage] = useState<string>(
    'Select a landmark or hotel to preview Street View',
  );
  const [hasImagery, setHasImagery] = useState<boolean>(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!streetViewLib || !container) return;

    const pano = new streetViewLib.StreetViewPanorama(container, {
      addressControl: false,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
      fullscreenControl: true,
      motionTracking: false,
      motionTrackingControl: false,
      zoomControl: true,
      visible: false,
    });
    const service = new streetViewLib.StreetViewService();

    panoramaRef.current = pano;
    serviceRef.current = service;

    return () => {
      pano.setVisible(false);
      panoramaRef.current = null;
      serviceRef.current = null;
    };
  }, [streetViewLib]);

  useEffect(() => {
    const pano = panoramaRef.current;
    const service = serviceRef.current;
    if (!pano || !service || !inspectedPlace) return;

    let cancelled = false;
    setStatusMessage('Searching nearest panorama...');

    service
      .getPanorama({
        location: inspectedPlace.location,
        radius: 250,
        preference: 'best' as google.maps.StreetViewPreference,
      })
      .then(({ data }) => {
        if (cancelled) return;
        const panoId = data.location?.pano;
        if (panoId) {
          pano.setPano(panoId);
          pano.setPov({ heading: 165, pitch: 4 });
          pano.setVisible(true);
          setHasImagery(true);
          setStatusMessage(
            data.location?.shortDescription ||
              data.location?.description ||
              'Live Street View panorama',
          );
        } else {
          pano.setVisible(false);
          setHasImagery(false);
          setStatusMessage(
            'No Street View imagery found within 250m of this place.',
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        pano.setVisible(false);
        setHasImagery(false);
        setStatusMessage(
          'Street View imagery is unavailable at this exact coordinate.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [inspectedPlace, streetViewLib]);

  return (
    <section
      data-testid="street-view-panel"
      className="street-view-panel"
      aria-label="Street View preview panel"
    >
      <div className="street-view-header">
        <div className="street-view-title">
          <span className="street-view-badge">Street View</span>
          <Compass size={14} />
          <span>
            {inspectedPlace
              ? inspectedPlace.displayName
              : 'No location selected'}
          </span>
        </div>
        <span className="street-view-status">{statusMessage}</span>
      </div>

      <div className="street-view-canvas-wrap">
        <div ref={containerRef} className="street-view-canvas" />
        {(!inspectedPlace || !hasImagery) && (
          <div className="street-view-fallback">
            <Compass size={22} />
            <strong>
              {inspectedPlace
                ? `Street View unavailable near ${inspectedPlace.displayName}`
                : 'Select a stop or hotel card to inspect Street View'}
            </strong>
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </section>
  );
}
