export type UnitsSystem = 'IMPERIAL' | 'METRIC';
export type BaseMapType = 'roadmap' | 'hybrid';

export interface SelectedLocation {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
  source: 'seed' | 'autocomplete' | 'map-click';
}

export interface WeatherTemperature {
  unit?: 'FAHRENHEIT' | 'CELSIUS' | string;
  degrees?: number;
}

export interface WeatherCondition {
  iconBaseUri?: string;
  description?: {
    text?: string;
    languageCode?: string;
  };
  type?: string;
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
  timeZone?: { id?: string };
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

export interface WeatherForecastDay {
  displayDate?: { year: number; month: number; day: number };
  daytimeForecast?: {
    weatherCondition?: WeatherCondition;
    precipitation?: WeatherPrecipitation;
    relativeHumidity?: number;
    uvIndex?: number;
    wind?: WeatherWind;
  };
  nighttimeForecast?: {
    weatherCondition?: WeatherCondition;
    precipitation?: WeatherPrecipitation;
  };
  maxTemperature?: WeatherTemperature;
  minTemperature?: WeatherTemperature;
  feelsLikeMaxTemperature?: WeatherTemperature;
  feelsLikeMinTemperature?: WeatherTemperature;
}

export interface WeatherForecastResponse {
  forecastDays?: WeatherForecastDay[];
  timeZone?: { id?: string };
}

export interface AirQualityColor {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

export interface AirQualityIndex {
  code: string;
  displayName: string;
  aqi: number;
  aqiDisplay: string;
  color?: AirQualityColor;
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

export interface AirQualityCurrentResponse {
  dateTime?: string;
  regionCode?: string;
  indexes?: AirQualityIndex[];
  pollutants?: AirQualityPollutant[];
  healthRecommendations?: AirQualityHealthRecommendations;
}

export interface PollenTypeInfo {
  code: 'TREE' | 'GRASS' | 'WEED' | string;
  displayName: string;
  inSeason?: boolean;
  indexInfo?: {
    code?: string;
    displayName?: string;
    value?: number;
    category?: string;
    indexDescription?: string;
    color?: {
      red?: number;
      green?: number;
      blue?: number;
    };
  };
  healthRecommendations?: string[];
}

export interface PollenPlantInfo {
  code: string;
  displayName: string;
  inSeason?: boolean;
  indexInfo?: {
    value?: number;
    category?: string;
  };
  plantDescription?: {
    type?: string;
    family?: string;
    season?: string;
    crossReaction?: string;
  };
}

export interface PollenDayInfo {
  date?: { year: number; month: number; day: number };
  pollenTypeInfo?: PollenTypeInfo[];
  plantInfo?: PollenPlantInfo[];
}

export interface PollenForecastResponse {
  regionCode?: string;
  dailyInfo?: PollenDayInfo[];
}

export interface SolarLatLng {
  latitude: number;
  longitude: number;
}

export interface SolarBuildingInsightsResponse {
  nonCoverage?: boolean;
  status?: number;
  code?: string;
  message?: string;
  name?: string;
  center?: SolarLatLng;
  boundingBox?: {
    sw: SolarLatLng;
    ne: SolarLatLng;
  };
  imageryDate?: { year: number; month: number; day: number };
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'BASE' | string;
  postalCode?: string;
  administrativeArea?: string;
  regionCode?: string;
  solarPotential?: {
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
    solarPanelConfigs?: Array<{
      panelsCount?: number;
      yearlyEnergyDcKwh?: number;
    }>;
  };
}

export interface SolarInsightState {
  status: 'idle' | 'loading' | 'success' | 'non-coverage' | 'error';
  data?: SolarBuildingInsightsResponse;
  message?: string;
}

export interface PlacesSearchTextResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
  }>;
}

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}
