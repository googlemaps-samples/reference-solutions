'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Eye } from 'lucide-react';

interface StreetViewPreviewProps {
  lat: number;
  lng: number;
  address: string;
}

export default function StreetViewPreview({ lat, lng, address }: StreetViewPreviewProps) {
  const streetViewLib = useMapsLibrary('streetView');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (!streetViewLib || !containerRef.current) return;

    let cancelled = false;
    setStatus('loading');

    const svService = new streetViewLib.StreetViewService();
    svService.getPanorama(
      {
        location: { lat, lng },
        radius: 150,
      },
      (data, svStatus) => {
        if (cancelled || !containerRef.current) return;

        if (svStatus === 'OK' && data?.location?.latLng) {
          try {
            const panorama = new streetViewLib.StreetViewPanorama(containerRef.current, {
              position: data.location.latLng,
              pov: { heading: 165, pitch: 4 },
              zoom: 1,
              addressControl: false,
              linksControl: true,
              motionTracking: false,
              fullscreenControl: true,
            });
            panoramaRef.current = panorama;
            setStatus('ready');
          } catch {
            setStatus('unavailable');
          }
        } else {
          setStatus('unavailable');
        }
      }
    );

    return () => {
      cancelled = true;
      if (panoramaRef.current) {
        panoramaRef.current.setVisible(false);
        panoramaRef.current = null;
      }
    };
  }, [streetViewLib, lat, lng]);

  return (
    <div className="section-card">
      <div className="section-header">
        <h3 className="section-title">
          <Eye size={15} />
          Street View Neighborhood Preview
        </h3>
        <span className="status-note" style={{ margin: 0 }}>
          {address}
        </span>
      </div>

      <div
        id="street-view-container"
        data-testid="street-view-container"
        className="street-view-box"
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {status !== 'ready' && (
          <div className="street-view-fallback">
            {status === 'loading'
              ? 'Loading Street View panorama...'
              : 'Street View panorama is unavailable for this preview environment or coordinate.'}
          </div>
        )}
      </div>
    </div>
  );
}
