import { useState, type FormEvent } from 'react';
import { Building2, Hospital, Navigation, Search, Star } from 'lucide-react';
import type { ShelterPlace } from '../types/hazard';

interface ShelterListCardProps {
  shelters: ShelterPlace[];
  selectedShelterId: string | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchShelters: (query: string) => void;
  onRouteToShelter: (shelter: ShelterPlace) => void;
}

function formatDistanceCompact(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function ShelterListCard({
  shelters,
  selectedShelterId,
  loading,
  error,
  searchQuery,
  onSearchShelters,
  onRouteToShelter,
}: ShelterListCardProps) {
  const [inputVal, setInputVal] = useState(searchQuery);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchShelters(inputVal);
  };

  return (
    <section
      id="shelter-list"
      data-testid="shelter-list"
      className="sidebar-card"
      aria-labelledby="shelter-list-heading"
    >
      <div className="card-header">
        <div className="card-title-row">
          <Hospital size={17} className="text-sky" />
          <h2 id="shelter-list-heading">Nearby Emergency Shelters</h2>
        </div>
        <span className="card-badge">{shelters.length} found</span>
      </div>

      <form onSubmit={handleSubmit} className="shelter-search-form">
        <input
          id="shelter-search-input"
          data-testid="shelter-search-input"
          type="text"
          className="form-input"
          placeholder="Search hospitals or community centers..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          aria-label="Search nearby Miami emergency shelters"
        />
        <button type="submit" className="search-icon-btn" disabled={loading} aria-label="Search shelters">
          <Search size={15} />
        </button>
      </form>

      {loading && <div className="empty-state-box">Searching Miami hospitals &amp; community centers via Places API (New)...</div>}

      {error && !loading && <div className="route-error-box">{error}</div>}

      {!loading && shelters.length === 0 && !error && (
        <div className="empty-state-box">No shelters returned yet. Try searching &quot;hospital&quot; or &quot;community center&quot;.</div>
      )}

      <div className="shelter-items">
        {shelters.map((shelter) => {
          const isHospital =
            shelter.types.includes('hospital') ||
            shelter.displayName.toLowerCase().includes('hospital');
          const isSelected = shelter.id === selectedShelterId;

          return (
            <article
              key={shelter.id}
              className={`shelter-item ${isSelected ? 'is-selected' : ''}`}
            >
              <div className="shelter-item-top">
                <div className="shelter-item-name">
                  {isHospital ? (
                    <Hospital size={15} className="text-sky shrink-0" />
                  ) : (
                    <Building2 size={15} className="text-emerald shrink-0" />
                  )}
                  <span>{shelter.displayName}</span>
                </div>
                <span
                  className={`shelter-safety-tag ${
                    shelter.insideFloodZone ? 'tag-warn' : 'tag-safe'
                  }`}
                >
                  {shelter.insideFloodZone ? 'In Flood Zone' : 'Safe Zone'}
                </span>
              </div>

              <div className="shelter-item-address">{shelter.formattedAddress}</div>

              <div className="shelter-item-footer">
                <div className="shelter-item-meta">
                  {shelter.rating ? (
                    <span className="rating-pill">
                      <Star size={12} fill="currentColor" />
                      {shelter.rating.toFixed(1)}
                      {shelter.userRatingCount ? ` (${shelter.userRatingCount})` : ''}
                    </span>
                  ) : (
                    <span className="status-text">
                      {shelter.businessStatus === 'OPERATIONAL' ? 'Operational' : 'Civic Shelter'}
                    </span>
                  )}
                  <span className="distance-pill">
                    ~{formatDistanceCompact(shelter.straightLineMeters)}
                  </span>
                </div>

                <button
                  type="button"
                  data-testid="route-here-btn"
                  className="route-here-btn"
                  onClick={() => onRouteToShelter(shelter)}
                >
                  <Navigation size={13} />
                  <span>Route Here</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
