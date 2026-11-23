'use client';

import { useEffect, useRef } from 'react';
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type Cluster,
} from '@googlemaps/markerclusterer';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { BRANCH_TYPE_META } from '@/lib/classify';
import type { Branch, BranchType } from '@/types/locator';

interface ClusteredBranchMarkersProps {
  branches: Branch[];
  selectedBranchId: string | null;
  fastestBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function createBranchSvgIcon(branchType: BranchType): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', '#ffffff');
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (branchType === 'flagship') {
    const path1 = document.createElementNS(SVG_NS, 'path');
    path1.setAttribute('d', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
    const path2 = document.createElementNS(SVG_NS, 'polyline');
    path2.setAttribute('points', '9 22 9 12 15 12 15 22');
    svg.append(path1, path2);
  } else if (branchType === 'kiosk') {
    const path1 = document.createElementNS(SVG_NS, 'path');
    path1.setAttribute('d', 'M17 8h1a4 4 0 1 1 0 8h-1');
    const path2 = document.createElementNS(SVG_NS, 'path');
    path2.setAttribute('d', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z');
    svg.append(path1, path2);
  } else {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '2');
    rect.setAttribute('y', '5');
    rect.setAttribute('width', '20');
    rect.setAttribute('height', '14');
    rect.setAttribute('rx', '2');
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '2');
    line.setAttribute('y1', '10');
    line.setAttribute('x2', '22');
    line.setAttribute('y2', '10');
    svg.append(rect, line);
  }

  return svg;
}

function createBranchPinElement(
  branch: Branch,
  isSelected: boolean,
  isFastest: boolean
): HTMLDivElement {
  const meta = BRANCH_TYPE_META[branch.branchType];
  const wrapper = document.createElement('div');
  wrapper.dataset.branchId = branch.id;
  wrapper.dataset.branchType = branch.branchType;
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.cursor = 'pointer';
  wrapper.style.transform = isSelected ? 'scale(1.18)' : 'scale(1)';
  wrapper.style.transition = 'transform 140ms ease';

  const pill = document.createElement('div');
  pill.style.display = 'flex';
  pill.style.alignItems = 'center';
  pill.style.gap = '5px';
  pill.style.padding = isSelected ? '6px 10px' : '5px 8px';
  pill.style.borderRadius = '999px';
  pill.style.backgroundColor = meta.color;
  pill.style.color = '#ffffff';
  pill.style.border = isSelected
    ? '3px solid #0f172a'
    : isFastest
      ? '2.5px solid #fde047'
      : '2px solid #ffffff';
  pill.style.boxShadow = isSelected
    ? '0 8px 20px rgba(15, 23, 42, 0.38)'
    : '0 4px 10px rgba(15, 23, 42, 0.25)';

  pill.appendChild(createBranchSvgIcon(branch.branchType));

  const label = document.createElement('span');
  label.style.fontSize = '11px';
  label.style.fontWeight = '700';
  label.style.lineHeight = '1';
  label.style.letterSpacing = '0.01em';
  label.textContent = isFastest ? `${meta.shortLabel} ★` : meta.shortLabel;
  pill.appendChild(label);

  const tip = document.createElement('div');
  tip.style.width = '0';
  tip.style.height = '0';
  tip.style.borderLeft = '6px solid transparent';
  tip.style.borderRight = '6px solid transparent';
  tip.style.borderTop = `7px solid ${isSelected ? '#0f172a' : meta.color}`;
  tip.style.marginTop = '-1px';

  wrapper.append(pill, tip);
  return wrapper;
}

function createClusterPinElement(count: number): HTMLDivElement {
  const size = count >= 20 ? 48 : count >= 10 ? 44 : 40;
  const badge = document.createElement('div');
  badge.dataset.testid = 'marker-cluster';
  badge.style.width = `${size}px`;
  badge.style.height = `${size}px`;
  badge.style.borderRadius = '999px';
  badge.style.background = 'linear-gradient(135deg, #1e293b 0%, #1d4ed8 100%)';
  badge.style.color = '#ffffff';
  badge.style.border = '3px solid #ffffff';
  badge.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.3)';
  badge.style.display = 'flex';
  badge.style.alignItems = 'center';
  badge.style.justifyContent = 'center';
  badge.style.fontSize = '13px';
  badge.style.fontWeight = '800';
  badge.style.cursor = 'pointer';
  badge.textContent = String(count);
  return badge;
}

export function ClusteredBranchMarkers({
  branches,
  selectedBranchId,
  fastestBranchId,
  onSelectBranch,
}: ClusteredBranchMarkersProps) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const cleanupListenersRef = useRef<Array<() => void>>([]);
  const onSelectBranchRef = useRef(onSelectBranch);
  onSelectBranchRef.current = onSelectBranch;

  useEffect(() => {
    if (!map || !markerLib) return;

    const clusterer = new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({
        radius: 68,
        maxZoom: 15,
        minPoints: 2,
      }),
      renderer: {
        render: ({ count, position }: Cluster) => {
          return new markerLib.AdvancedMarkerElement({
            position,
            content: createClusterPinElement(count),
            zIndex: 1000 + count,
            title: `${count} NYC branches`,
          });
        },
      },
      onClusterClick: (_, cluster, targetMap) => {
        if (cluster.bounds) {
          targetMap.fitBounds(cluster.bounds, 64);
        } else if (cluster.position) {
          targetMap.panTo(cluster.position);
          targetMap.setZoom((targetMap.getZoom() ?? 12) + 2);
        }
      },
    });

    clustererRef.current = clusterer;

    return () => {
      cleanupListenersRef.current.forEach((fn) => fn());
      cleanupListenersRef.current = [];
      markersRef.current.forEach((m) => {
        m.map = null;
      });
      markersRef.current = [];
      clusterer.clearMarkers(true);
      clusterer.setMap(null);
      clustererRef.current = null;
    };
  }, [map, markerLib]);

  useEffect(() => {
    const clusterer = clustererRef.current;
    if (!clusterer || !markerLib || !map) return;

    cleanupListenersRef.current.forEach((fn) => fn());
    cleanupListenersRef.current = [];
    markersRef.current.forEach((m) => {
      m.map = null;
    });

    const nextMarkers = branches.map((branch) => {
      const isSelected = branch.id === selectedBranchId;
      const isFastest = branch.id === fastestBranchId;

      const marker = new markerLib.AdvancedMarkerElement({
        position: branch.location,
        title: branch.name,
        content: createBranchPinElement(branch, isSelected, isFastest),
        zIndex: isSelected ? 900 : isFastest ? 650 : 200,
      });

      const handleClick = () => {
        onSelectBranchRef.current(branch.id);
      };
      marker.addEventListener('click', handleClick);
      cleanupListenersRef.current.push(() => {
        marker.removeEventListener('click', handleClick);
      });

      return marker;
    });

    markersRef.current = nextMarkers;
    clusterer.clearMarkers(true);
    clusterer.addMarkers(nextMarkers);
  }, [branches, selectedBranchId, fastestBranchId, markerLib, map]);

  return null;
}
