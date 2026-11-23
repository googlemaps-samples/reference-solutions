import type { Layer } from '@deck.gl/core';
import type { HazardIncident } from '$lib/types';

export type HeatmapRenderMode = 'deckgl-webgl2' | 'canvas-fallback';

interface DeckOverlayLike {
	setMap: (map: google.maps.Map | null) => void;
	setProps: (props: { layers: Layer[] }) => void;
	finalize: () => void;
}

type HeatmapLayerCtor = new (props: Record<string, unknown>) => Layer;

function detectWebGL2Support(): boolean {
	if (typeof document === 'undefined') return false;
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2');
		return Boolean(gl);
	} catch {
		return false;
	}
}

export class HeatmapOverlayController {
	private map: google.maps.Map;
	private mapsLib: google.maps.MapsLibrary;
	private overlay: DeckOverlayLike | null = null;
	private HeatmapLayerClass: HeatmapLayerCtor | null = null;
	private fallbackCircles: google.maps.Circle[] = [];
	private visible = true;
	private incidents: HazardIncident[] = [];
	public mode: HeatmapRenderMode = 'canvas-fallback';

	constructor(map: google.maps.Map, mapsLib: google.maps.MapsLibrary) {
		this.map = map;
		this.mapsLib = mapsLib;
	}

	async init(initialIncidents: HazardIncident[]): Promise<HeatmapRenderMode> {
		this.incidents = initialIncidents;

		if (detectWebGL2Support()) {
			try {
				const [{ GoogleMapsOverlay }, { HeatmapLayer }] = await Promise.all([
					import('@deck.gl/google-maps'),
					import('@deck.gl/aggregation-layers')
				]);

				this.HeatmapLayerClass = HeatmapLayer as unknown as HeatmapLayerCtor;
				const layer = this.createDeckHeatmapLayer(this.incidents, this.visible);
				const overlay = new GoogleMapsOverlay({
					layers: layer ? [layer] : [],
					onError: () => {
						// Gracefully downgrade if WebGL context fails after initialization
						this.teardownDeckOverlay();
						this.mode = 'canvas-fallback';
						this.renderFallbackCircles();
					}
				});
				overlay.setMap(this.map);
				this.overlay = overlay as unknown as DeckOverlayLike;
				this.mode = 'deckgl-webgl2';
				return this.mode;
			} catch {
				this.teardownDeckOverlay();
			}
		}

		// Graceful non-WebGL2 fallback (e.g., headless environments without GPU)
		this.mode = 'canvas-fallback';
		this.renderFallbackCircles();
		return this.mode;
	}

	private createDeckHeatmapLayer(incidents: HazardIncident[], visible: boolean): Layer | null {
		if (!this.HeatmapLayerClass) return null;
		return new this.HeatmapLayerClass({
			id: 'miami-hazard-heatmap',
			data: incidents,
			getPosition: (d: HazardIncident) => [d.lng, d.lat],
			getWeight: (d: HazardIncident) => d.weight,
			radiusPixels: 42,
			intensity: 1.35,
			threshold: 0.04,
			opacity: 0.78,
			visible,
			colorRange: [
				[254, 240, 138, 120],
				[253, 224, 71, 160],
				[251, 146, 60, 195],
				[239, 68, 68, 220],
				[185, 28, 28, 240],
				[127, 29, 29, 255]
			]
		});
	}

	private renderFallbackCircles(): void {
		this.clearFallbackCircles();
		if (!this.visible) return;

		for (const inc of this.incidents) {
			const outer = new this.mapsLib.Circle({
				map: this.map,
				center: { lat: inc.lat, lng: inc.lng },
				radius: 170 + inc.weight * 48,
				strokeWeight: 0,
				fillColor: inc.weight >= 5 ? '#ef4444' : '#f97316',
				fillOpacity: 0.16,
				clickable: false,
				zIndex: 1
			});
			const core = new this.mapsLib.Circle({
				map: this.map,
				center: { lat: inc.lat, lng: inc.lng },
				radius: 65 + inc.weight * 18,
				strokeWeight: 0,
				fillColor: inc.weight >= 5 ? '#b91c1c' : '#ea580c',
				fillOpacity: 0.28,
				clickable: false,
				zIndex: 2
			});
			this.fallbackCircles.push(outer, core);
		}
	}

	private clearFallbackCircles(): void {
		for (const circle of this.fallbackCircles) {
			circle.setMap(null);
		}
		this.fallbackCircles = [];
	}

	private teardownDeckOverlay(): void {
		if (this.overlay) {
			try {
				this.overlay.setMap(null);
				this.overlay.finalize();
			} catch {
				// Ignore cleanup errors
			}
			this.overlay = null;
		}
	}

	updateIncidents(incidents: HazardIncident[]): void {
		this.incidents = incidents;
		if (this.mode === 'deckgl-webgl2' && this.overlay && this.HeatmapLayerClass) {
			const layer = this.createDeckHeatmapLayer(this.incidents, this.visible);
			this.overlay.setProps({ layers: layer ? [layer] : [] });
		} else {
			this.renderFallbackCircles();
		}
	}

	setVisible(visible: boolean): void {
		this.visible = visible;
		if (this.mode === 'deckgl-webgl2' && this.overlay && this.HeatmapLayerClass) {
			const layer = this.createDeckHeatmapLayer(this.incidents, this.visible);
			this.overlay.setProps({ layers: layer ? [layer] : [] });
		} else {
			this.renderFallbackCircles();
		}
	}

	destroy(): void {
		this.teardownDeckOverlay();
		this.clearFallbackCircles();
	}
}
