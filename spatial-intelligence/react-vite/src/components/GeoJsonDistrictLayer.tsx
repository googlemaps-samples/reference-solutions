import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { getDistrictFillColor, NYC_DISTRICTS_GEOJSON } from '../data/nycDistricts';

interface GeoJsonDistrictLayerProps {
  visible: boolean;
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
}

export const GeoJsonDistrictLayer: React.FC<GeoJsonDistrictLayerProps> = ({
  visible,
  selectedDistrictId,
  onSelectDistrict
}) => {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const hoveredDistrictRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedDistrictId);
  const onSelectRef = useRef(onSelectDistrict);

  selectedIdRef.current = selectedDistrictId;
  onSelectRef.current = onSelectDistrict;

  useEffect(() => {
    if (!map || !mapsLibrary) return;

    // Dedicated google.maps.Data instance keeps NYC districts isolated from Terra Draw's map.data layer
    const dataLayer = new google.maps.Data();
    dataLayer.addGeoJson(NYC_DISTRICTS_GEOJSON);
    dataLayerRef.current = dataLayer;

    const applyStyles = () => {
      dataLayer.setStyle((feature) => {
        const districtId = String(feature.getProperty('districtId') ?? '');
        const capacityPct = Number(feature.getProperty('capacityPct') ?? 50);
        const isSelected = districtId === selectedIdRef.current;
        const isHovered = districtId === hoveredDistrictRef.current;
        const fillColor = getDistrictFillColor(capacityPct);

        return {
          fillColor,
          fillOpacity: isSelected ? 0.42 : isHovered ? 0.34 : 0.2,
          strokeColor: isSelected ? '#38bdf8' : isHovered ? '#f8fafc' : fillColor,
          strokeWeight: isSelected ? 3 : isHovered ? 2.2 : 1.5,
          strokeOpacity: isSelected ? 1 : 0.85,
          zIndex: isSelected ? 4 : isHovered ? 3 : 1,
          clickable: true
        };
      });
    };

    applyStyles();

    const clickListener = dataLayer.addListener(
      'click',
      (event: google.maps.Data.MouseEvent) => {
        const districtId = event.feature.getProperty('districtId');
        if (typeof districtId === 'string') {
          onSelectRef.current(districtId);
        }
      }
    );

    const mouseOverListener = dataLayer.addListener(
      'mouseover',
      (event: google.maps.Data.MouseEvent) => {
        const districtId = event.feature.getProperty('districtId');
        hoveredDistrictRef.current = typeof districtId === 'string' ? districtId : null;
        applyStyles();
      }
    );

    const mouseOutListener = dataLayer.addListener('mouseout', () => {
      hoveredDistrictRef.current = null;
      applyStyles();
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(mouseOverListener);
      google.maps.event.removeListener(mouseOutListener);
      dataLayer.setMap(null);
      dataLayerRef.current = null;
    };
  }, [map, mapsLibrary]);

  useEffect(() => {
    const dataLayer = dataLayerRef.current;
    if (!dataLayer || !map) return;

    dataLayer.setMap(visible ? map : null);
  }, [visible, map]);

  useEffect(() => {
    const dataLayer = dataLayerRef.current;
    if (!dataLayer) return;

    dataLayer.setStyle((feature) => {
      const districtId = String(feature.getProperty('districtId') ?? '');
      const capacityPct = Number(feature.getProperty('capacityPct') ?? 50);
      const isSelected = districtId === selectedDistrictId;
      const isHovered = districtId === hoveredDistrictRef.current;
      const fillColor = getDistrictFillColor(capacityPct);

      return {
        fillColor,
        fillOpacity: isSelected ? 0.42 : isHovered ? 0.34 : 0.2,
        strokeColor: isSelected ? '#38bdf8' : isHovered ? '#f8fafc' : fillColor,
        strokeWeight: isSelected ? 3 : isHovered ? 2.2 : 1.5,
        strokeOpacity: isSelected ? 1 : 0.85,
        zIndex: isSelected ? 4 : isHovered ? 3 : 1,
        clickable: true
      };
    });
  }, [selectedDistrictId]);

  return null;
};
