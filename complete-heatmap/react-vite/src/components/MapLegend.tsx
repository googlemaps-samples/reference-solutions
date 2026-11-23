interface MapLegendProps {
  rendererMode: 'webgl2' | 'canvas-fallback';
}

export function MapLegend({ rendererMode }: MapLegendProps) {
  return (
    <aside className="map-legend-overlay" aria-label="Map Legend and Civic Disclaimer">
      <div className="legend-header">
        <strong>Hazard &amp; Shelter Legend</strong>
        <span className="renderer-pill">
          {rendererMode === 'webgl2' ? 'deck.gl WebGL2' : '2D Thermal Fallback'}
        </span>
      </div>

      <div className="legend-grid">
        <div className="legend-item">
          <span className="swatch swatch-heatmap" />
          <span>Storm / Flood Heatmap</span>
        </div>
        <div className="legend-item">
          <span className="swatch swatch-polygon" />
          <span>Active Flood-Hazard Zone</span>
        </div>
        <div className="legend-item">
          <span className="swatch swatch-route" />
          <span>Safe Evacuation Route</span>
        </div>
        <div className="legend-item">
          <span className="swatch swatch-hospital" />
          <span>Hospital (H) / Shelter (S)</span>
        </div>
        <div className="legend-item">
          <span className="swatch swatch-incident" />
          <span>Selected Incident Origin (!)</span>
        </div>
      </div>

      <p className="civic-disclaimer">
        For civic situational awareness and evacuation planning only. Follow official Miami-Dade Emergency Management directives during active weather emergencies.
      </p>
    </aside>
  );
}
