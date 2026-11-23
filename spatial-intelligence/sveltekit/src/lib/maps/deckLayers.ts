import type { DeckLayerMode, SensorPoint } from '$lib/types/gis';
import { getSensorLoadRgba } from '$lib/utils/geo';

export interface DeckOverlayController {
  update: (mode: DeckLayerMode, data: SensorPoint[], visible: boolean) => void;
  destroy: () => void;
}

/**
 * Dynamically initializes @deck.gl/google-maps GoogleMapsOverlay in the browser.
 * Caller should verify isWebGL2Supported() before invoking so headless environments
 * without WebGL2 emit zero console errors.
 */
export async function createDeckOverlayController(
  map: google.maps.Map,
  initialMode: DeckLayerMode,
  initialData: SensorPoint[]
): Promise<DeckOverlayController> {
  const [{ GoogleMapsOverlay }, { ScatterplotLayer }, { HexagonLayer }] =
    await Promise.all([
      import('@deck.gl/google-maps'),
      import('@deck.gl/layers'),
      import('@deck.gl/aggregation-layers')
    ]);

  const buildLayers = (
    mode: DeckLayerMode,
    data: SensorPoint[],
    visible: boolean
  ) => {
    if (!visible) return [];

    if (mode === 'hexagon') {
      return [
        new HexagonLayer<SensorPoint>({
          id: 'nyc-sensor-hexagon-layer',
          data,
          gpuAggregation: false,
          extruded: true,
          radius: 260,
          elevationScale: 8,
          coverage: 0.84,
          pickable: true,
          getPosition: (d: SensorPoint) => [d.lng, d.lat],
          getColorWeight: (d: SensorPoint) => d.loadPct,
          getElevationWeight: (d: SensorPoint) => d.outputMW,
          colorAggregation: 'MEAN',
          elevationAggregation: 'SUM',
          colorRange: [
            [14, 165, 233],
            [20, 184, 166],
            [234, 179, 8],
            [249, 115, 22],
            [239, 68, 68]
          ]
        })
      ];
    }

    return [
      new ScatterplotLayer<SensorPoint>({
        id: 'nyc-sensor-scatterplot-layer',
        data,
        pickable: true,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 3,
        radiusMaxPixels: 11,
        lineWidthMinPixels: 1,
        getPosition: (d: SensorPoint) => [d.lng, d.lat],
        getRadius: (d: SensorPoint) => 32 + d.outputMW * 14,
        getFillColor: (d: SensorPoint) => getSensorLoadRgba(d.loadPct, 205),
        getLineColor: [15, 23, 42, 220]
      })
    ];
  };

  const overlay = new GoogleMapsOverlay({
    interleaved: false,
    layers: buildLayers(initialMode, initialData, true)
  });

  overlay.setMap(map);

  return {
    update(mode: DeckLayerMode, data: SensorPoint[], visible: boolean) {
      overlay.setProps({
        layers: buildLayers(mode, data, visible)
      });
    },
    destroy() {
      overlay.setMap(null);
      overlay.finalize();
    }
  };
}
