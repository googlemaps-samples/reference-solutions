export type UnitsSystem = 'IMPERIAL' | 'METRIC';
export type MapTypeOption = 'roadmap' | 'hybrid';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface InspectedLocation {
  name: string;
  formattedAddress: string;
  coords: LatLngPoint;
  placeId?: string;
  source: 'seed' | 'autocomplete' | 'map-click';
  viewport?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral | null;
}

/* ---------------- Weather API Types ---------------- */

export interface WeatherLocalizedText {
  text: string;
  languageCode?: string;
}

export interface WeatherCondition {
  iconBaseUri?: string;
  description?: WeatherLocalizedText;
  type?: string;
}

export interface WeatherTemperature {
  unit: 'CELSIUS' | 'FAHRENHEIT' | string;
  degrees: number;
}

export interface WeatherWind {
  direction?: {
    cardinal?: string;
    degrees?: number;
  };
  speed?: {
    unit?: string;
    value?: number;
  };
  gust?: {
    unit?: string;
    value?: number;
  };
}

export interface WeatherPrecipitation {
  probability?: {
    type?: string;
    percent?: number;
  };
  qpf?: {
    unit?: string;
    quantity?: number;
  };
}

export interface WeatherCurrentResponse {
  currentTime?: string;
  timeZone?: {
    id?: string;
  };
  weatherCondition?: WeatherCondition;
  temperature?: WeatherTemperature;
  feelsLikeTemperature?: WeatherTemperature;
  relativeHumidity?: number;
  uvIndex?: number;
  wind?: WeatherWind;
  precipitation?: WeatherPrecipitation;
  cloudCover?: number;
  isDaytime?: boolean;
}

export interface WeatherForecastDayPart {
  weatherCondition?: WeatherCondition;
  precipitation?: WeatherPrecipitation;
  wind?: WeatherWind;
  relativeHumidity?: number;
  uvIndex?: number;
  cloudCover?: number;
}

export interface WeatherForecastDay {
  displayDate?: {
    year: number;
    month: number;
    day: number;
  };
  daytimeForecast?: WeatherForecastDayPart;
  nighttimeForecast?: WeatherForecastDayPart;
  maxTemperature?: WeatherTemperature;
  minTemperature?: WeatherTemperature;
  feelsLikeMaxTemperature?: WeatherTemperature;
  feelsLikeMinTemperature?: WeatherTemperature;
}

export interface WeatherForecastResponse {
  forecastDays?: WeatherForecastDay[];
  timeZone?: {
    id?: string;
  };
}

/* ---------------- Air Quality API Types ---------------- */

export interface AqiColor {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

export interface AirQualityIndex {
  code: string;
  displayName: string;
  aqi?: number;
  aqiDisplay?: string;
  color?: AqiColor;
  category?: string;
  dominantPollutant?: string;
}

export interface AirQualityPollutant {
  code: string;
  displayName: string;
  fullName?: string;
  concentration?: {
    value: number;
    units: string;
  };
  additionalInfo?: {
    sources?: string;
    effects?: string;
  };
}

export interface AirQualityHealthRecommendations {
  generalPopulation?: string;
  elderly?: string;
  lungDiseasePopulation?: string;
  heartDiseasePopulation?: string;
  athletes?: string;
  pregnantWomen?: string;
  children?: string;
}

export interface AirQualityResponse {
  dateTime?: string;
  regionCode?: string;
  indexes?: AirQualityIndex[];
  pollutants?: AirQualityPollutant[];
  healthRecommendations?: AirQualityHealthRecommendations;
}

/* ---------------- Pollen API Types ---------------- */

export interface PollenIndexInfo {
  code?: string;
  displayName?: string;
  value?: number;
  category?: string;
  indexDescription?: string;
  color?: AqiColor;
}

export interface PollenTypeInfo {
  code: 'TREE' | 'GRASS' | 'WEED' | string;
  displayName: string;
  inSeason?: boolean;
  indexInfo?: PollenIndexInfo;
  healthRecommendations?: string[];
}

export interface PollenPlantInfo {
  code: string;
  displayName: string;
  inSeason?: boolean;
  indexInfo?: PollenIndexInfo;
  plantDescription?: {
    type?: string;
    family?: string;
    season?: string;
    crossReaction?: string;
    picture?: string;
    pictureCloseup?: string;
  };
}

export interface PollenDayInfo {
  date?: {
    year: number;
    month: number;
    day: number;
  };
  pollenTypeInfo?: PollenTypeInfo[];
  plantInfo?: PollenPlantInfo[];
}

export interface PollenForecastResponse {
  regionCode?: string;
  dailyInfo?: PollenDayInfo[];
}

/* ---------------- Solar API Types ---------------- */

export interface SolarLatLng {
  latitude: number;
  longitude: number;
}

export interface SolarBoundingBox {
  sw: SolarLatLng;
  ne: SolarLatLng;
}

export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
}

export interface SolarPotential {
  maxArrayPanelsCount?: number;
  panelCapacityWatts?: number;
  panelHeightMeters?: number;
  panelWidthMeters?: number;
  panelLifetimeYears?: number;
  maxArrayAreaMeters2?: number;
  maxSunshineHoursPerYear?: number;
  carbonOffsetFactorKgPerMwh?: number;
  wholeRoofStats?: {
    areaMeters2?: number;
    groundAreaMeters2?: number;
    sunshineQuantiles?: number[];
  };
  solarPanelConfigs?: SolarPanelConfig[];
}

export interface SolarBuildingInsightsResponse {
  name?: string;
  center?: SolarLatLng;
  boundingBox?: SolarBoundingBox;
  imageryDate?: {
    year: number;
    month: number;
    day: number;
  };
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW' | 'BASE' | string;
  postalCode?: string;
  administrativeArea?: string;
  regionCode?: string;
  solarPotential?: SolarPotential;
}

export type EndpointResult<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'non-coverage'; message: string }
  | { status: 'error'; message: string };

export interface EnvironmentalSnapshot {
  weatherCurrent: EndpointResult<WeatherCurrentResponse>;
  weatherForecast: EndpointResult<WeatherForecastResponse>;
  airQuality: EndpointResult<AirQualityResponse>;
  pollen: EndpointResult<PollenForecastResponse>;
  solar: EndpointResult<SolarBuildingInsightsResponse>;
}
