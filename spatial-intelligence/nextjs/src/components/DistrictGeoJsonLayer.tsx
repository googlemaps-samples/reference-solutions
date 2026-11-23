'use client';

import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import {
  NYC_DISTRICTS_GEOJSON,
  type DistrictProperties,
} from '@/lib/nyc-spatial-data';

interface DistrictGeoJsonLayerProps {
  visible: boolean;
  selectedDistrictId: string | null;
  onSelectDistrict: (district: DistrictProperties) => void;
}

function getDistrictFillColor(loadPct: number): string {
  if (loadPct >= 80) return '#ef4444';
  if (loadPct >= 65) return '#f59e0b';
  return '#10b981';
}

export const DistrictGeoJsonLayer: React.FC<DistrictGeoJsonLayerProps> = ({
  visible,
  selectedDistrictId,
  onSelectDistrict,
}) => {
  const map = useMap();
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedDistrictId);
  selectedIdRef.current = selectedDistrictId;

  const onSelectRef = useRef(onSelectDistrict);
  onSelectRef.current = onSelectDistrict;

  const applyStyle = () => {
    if (!map) return;
    map.data.setStyle((feature) => {
      const id = String(feature.getProperty('id') || '');
      const loadPct = Number(feature.getProperty('capacityLoadPct') || 50);
      const isSelected = selectedIdRef.current === id;
      const isHovered = hoveredIdRef.current === id;
      const color = getDistrictFillColor(loadPct);

      return {
        fillColor: color,
        fillOpacity: isSelected ? 0.38 : isHovered ? 0.28 : 0.16,
        strokeColor: isSelected ? '#ffffff' : color,
        strokeWeight: isSelected ? 3 : isHovered ? 2.5 : 1.5,
        strokeOpacity: isSelected ? 0.95 : 0.85,
        clickable: true,
        zIndex: isSelected ? 3 : isHovered ? 2 : 1,
      };
    });
  };

  useEffect(() => {
    if (!map) return;

    const addedFeatures = map.data.addGeoJson(NYC_DISTRICTS_GEOJSON);
    applyStyle();

    const clickListener = map.data.addListener(
      'click',
      (event: google.maps.Data.MouseEvent) => {
        const featureId = String(event.feature.getProperty('id') || '');
        const match = NYC_DISTRICTS_GEOJSON.features.find(
          (f) => f.properties.id === featureId
        );
        if (match) {
          onSelectRef.current(match.properties);
        }
      }
    );

    const overListener = map.data.addListener(
      'mouseover',
      (event: google.maps.Data.MouseEvent) => {
        hoveredIdRef.current = String(event.feature.getProperty('id') || '');
        applyStyle();
      }
    );

    const outListener = map.data.addListener('mouseout', () => {
      hoveredIdRef.current = null;
      applyStyle();
    });

    return () => {
      clickListener.remove();
      overListener.remove();
      outListener.remove();
      addedFeatures.forEach((feature) => {
        map.data.remove(feature);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!map) return;
    map.data.setMap(visible ? map : null);
  }, [map, visible]);

  useEffect(() => {
    applyStyle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrictId, map]);

  return null;
};
