import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ActiveRouteSummary,
  AutocompleteSuggestionItem,
  BranchLocation,
  BranchType,
  DEFAULT_ORIGIN,
  OriginPoint,
  PRESET_ORIGINS,
  SERVICE_METADATA,
  ServiceTag,
  TravelModeOption,
} from './models/store.models';
import { MapsLoaderService } from './services/maps-loader.service';
import { PlacesService } from './services/places.service';
import { RoutesService } from './services/routes.service';
import { LocatorMapComponent } from './components/locator-map/locator-map.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, LocatorMapComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly mapsLoader = inject(MapsLoaderService);
  private readonly placesService = inject(PlacesService);
  private readonly routesService = inject(RoutesService);

  readonly mapsReady = signal<boolean>(false);
  readonly loadingBranches = signal<boolean>(true);
  readonly loadingMatrix = signal<boolean>(false);
  readonly loadingRoute = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly origin = signal<OriginPoint>(DEFAULT_ORIGIN);
  readonly originInput = signal<string>(DEFAULT_ORIGIN.label);
  readonly presetOrigins = PRESET_ORIGINS;
  readonly suggestions = signal<AutocompleteSuggestionItem[]>([]);
  readonly showDropdown = signal<boolean>(false);

  readonly travelMode = signal<TravelModeOption>('DRIVE');
  readonly selectedTypeFilter = signal<'all' | BranchType>('all');
  readonly activeServiceFilters = signal<Set<ServiceTag>>(new Set());

  readonly branches = signal<BranchLocation[]>([]);
  readonly selectedBranchId = signal<string | null>(null);
  readonly activeRoute = signal<ActiveRouteSummary | null>(null);

  readonly serviceOptions: Array<{
    key: ServiceTag;
    label: string;
    testId: string;
  }> = [
    { key: 'pickup', ...SERVICE_METADATA.pickup },
    { key: 'coffee', ...SERVICE_METADATA.coffee },
    { key: 'cash', ...SERVICE_METADATA.cash },
    { key: 'open24', ...SERVICE_METADATA.open24 },
  ];

  readonly filteredBranches = computed<BranchLocation[]>(() => {
    const typeFilter = this.selectedTypeFilter();
    const serviceFilters = this.activeServiceFilters();

    const filtered = this.branches().filter((branch) => {
      if (typeFilter !== 'all' && branch.type !== typeFilter) {
        return false;
      }
      if (serviceFilters.size > 0) {
        for (const req of serviceFilters) {
          if (!branch.services.includes(req)) {
            return false;
          }
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const durA = a.durationMillis ?? Number.MAX_SAFE_INTEGER;
      const durB = b.durationMillis ?? Number.MAX_SAFE_INTEGER;
      return durA - durB;
    });
  });

  readonly fastestBranch = computed<BranchLocation | null>(() => {
    const list = this.filteredBranches();
    if (list.length === 0) return null;
    const withDuration = list.filter((b) => b.durationMillis !== null);
    if (withDuration.length === 0) return list[0];
    return withDuration.reduce((best, curr) =>
      (curr.durationMillis ?? Infinity) < (best.durationMillis ?? Infinity)
        ? curr
        : best
    );
  });

  readonly selectedBranch = computed<BranchLocation | null>(() => {
    const id = this.selectedBranchId();
    if (!id) return null;
    return this.branches().find((b) => b.id === id) ?? null;
  });

  private autocompleteDebounceTimer: ReturnType<typeof setTimeout> | null =
    null;

  async ngOnInit(): Promise<void> {
    try {
      await this.mapsLoader.load();
      this.mapsReady.set(true);
      await this.loadInitialBranches();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to initialize Google Maps Platform.';
      this.errorMessage.set(msg);
      this.loadingBranches.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.autocompleteDebounceTimer) {
      clearTimeout(this.autocompleteDebounceTimer);
    }
  }

  private async loadInitialBranches(): Promise<void> {
    this.loadingBranches.set(true);
    this.errorMessage.set(null);

    try {
      const found = await this.placesService.searchNycBranches();
      this.branches.set(found);
      this.loadingBranches.set(false);
      await this.refreshRouteMatrix();
    } catch (err) {
      console.error('Failed to search NYC branches:', err);
      this.errorMessage.set(
        'Could not load NYC branches from Places API (New). Check API key permissions.'
      );
      this.loadingBranches.set(false);
    }
  }

  async refreshRouteMatrix(): Promise<void> {
    const currentBranches = this.branches();
    if (currentBranches.length === 0) return;

    this.loadingMatrix.set(true);
    try {
      const matrix = await this.routesService.computeRouteMatrix(
        this.origin(),
        currentBranches,
        this.travelMode()
      );

      const updated = currentBranches.map((branch) => {
        const metrics = matrix.get(branch.id);
        if (!metrics) {
          return {
            ...branch,
            durationMillis: null,
            distanceMeters: null,
            etaText: 'Unavailable',
            distanceText: '—',
          };
        }
        return {
          ...branch,
          durationMillis: metrics.durationMillis,
          distanceMeters: metrics.distanceMeters,
          etaText: metrics.etaText,
          distanceText: metrics.distanceText,
        };
      });

      this.branches.set(updated);

      if (this.selectedBranchId()) {
        const stillExists = updated.find(
          (b) => b.id === this.selectedBranchId()
        );
        if (stillExists) {
          await this.selectBranch(stillExists);
        }
      }
    } finally {
      this.loadingMatrix.set(false);
    }
  }

  onOriginInputChanged(value: string): void {
    this.originInput.set(value);
    if (this.autocompleteDebounceTimer) {
      clearTimeout(this.autocompleteDebounceTimer);
    }

    if (value.trim().length < 2) {
      this.suggestions.set([]);
      this.showDropdown.set(false);
      return;
    }

    this.autocompleteDebounceTimer = setTimeout(async () => {
      try {
        const items = await this.placesService.fetchAutocomplete(value);
        this.suggestions.set(items);
        this.showDropdown.set(items.length > 0);
      } catch (err) {
        console.error('Autocomplete error:', err);
        this.suggestions.set([]);
        this.showDropdown.set(false);
      }
    }, 220);
  }

  async onSelectSuggestion(item: AutocompleteSuggestionItem): Promise<void> {
    this.showDropdown.set(false);
    this.originInput.set(item.fullText);

    const resolved = await this.placesService.resolveSuggestion(item);
    if (resolved) {
      this.origin.set(resolved);
      this.originInput.set(resolved.label);
      this.activeRoute.set(null);
      await this.refreshRouteMatrix();
    }
  }

  async onOriginSubmit(): Promise<void> {
    this.showDropdown.set(false);
    const currentSuggestions = this.suggestions();
    if (currentSuggestions.length > 0) {
      await this.onSelectSuggestion(currentSuggestions[0]);
      return;
    }

    const query = this.originInput().trim();
    if (!query) return;

    const geocoded = await this.placesService.geocodeAddress(query);
    if (geocoded) {
      this.origin.set(geocoded);
      this.originInput.set(geocoded.address);
      this.activeRoute.set(null);
      await this.refreshRouteMatrix();
    }
  }

  async onPresetOriginSelected(label: string): Promise<void> {
    const match = this.presetOrigins.find((p) => p.label === label);
    if (!match) return;
    this.showDropdown.set(false);
    this.origin.set(match);
    this.originInput.set(match.label);
    this.activeRoute.set(null);
    await this.refreshRouteMatrix();
  }

  async onTravelModeChanged(mode: TravelModeOption): Promise<void> {
    this.travelMode.set(mode);
    await this.refreshRouteMatrix();
  }

  setTypeFilter(filter: 'all' | BranchType): void {
    this.selectedTypeFilter.set(filter);
  }

  toggleServiceFilter(tag: ServiceTag): void {
    const next = new Set(this.activeServiceFilters());
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    this.activeServiceFilters.set(next);
  }

  isServiceFilterActive(tag: ServiceTag): boolean {
    return this.activeServiceFilters().has(tag);
  }

  async routeToFastest(): Promise<void> {
    const fastest = this.fastestBranch();
    if (fastest) {
      await this.selectBranch(fastest);
    }
  }

  async selectBranch(branch: BranchLocation): Promise<void> {
    this.selectedBranchId.set(branch.id);
    this.loadingRoute.set(true);

    try {
      const result = await this.routesService.computeRoute(
        this.origin(),
        branch,
        this.travelMode()
      );

      if (result) {
        this.activeRoute.set({
          branchId: branch.id,
          branchName: branch.name,
          branchTypeLabel: branch.typeLabel,
          travelMode: this.travelMode(),
          etaText: result.etaText,
          distanceText: result.distanceText,
          durationMillis: result.durationMillis,
          distanceMeters: result.distanceMeters,
          route: result.route,
        });
      }
    } catch (err) {
      console.error('Route.computeRoutes failed:', err);
    } finally {
      this.loadingRoute.set(false);
    }
  }

  clearDropdownDelayed(): void {
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 180);
  }
}
