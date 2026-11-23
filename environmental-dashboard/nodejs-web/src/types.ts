export type UnitsSystem = 'IMPERIAL' | 'METRIC';

export interface LatLngLiteral {
  latitude: number;
  longitude: number;
}

export interface WeatherTemperature {
  unit?: string;
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
  timeZone?: {
    id?: string;
    version?: string;
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

export interface ForecastDayPart {
  weatherCondition?: WeatherCondition;
  precipitation?: WeatherPrecipitation;
  wind?: WeatherWind;
  relativeHumidity?: number;
  uvIndex?: number;
  cloudCover?: number;
}

export interface ForecastDay {
  displayDate?: {
    year: number;
    month: number;
    day: number;
  };
  daytimeForecast?: ForecastDayPart;
  nighttimeForecast?: ForecastDayPart;
  maxTemperature?: WeatherTemperature;
  minTemperature?: WeatherTemperature;
  feelsLikeMaxTemperature?: WeatherTemperature;
  feelsLikeMinTemperature?: WeatherTemperature;
}

export interface WeatherForecastResponse {
  forecastDays?: ForecastDay[];
  timeZone?: {
    id?: string;
  };
}

export interface AirQualityIndex {
  code: string;
  displayName: string;
  aqi: number;
  aqiDisplay: string;
  color?: {
    red?: number;
    green?: number;
    blue?: number;
    alpha?: number;
  };
  category: string;
  dominantPollutant?: string;
}

export interface Pollutant {
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

export interface HealthRecommendations {
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
  pollutants?: Pollutant[];
  healthRecommendations?: HealthRecommendations;
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

export interface PlantInfo {
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
    picture?: string;
  };
}

export interface PollenDayInfo {
  date?: {
    year: number;
    month: number;
    day: number;
  };
  pollenTypeInfo?: PollenTypeInfo[];
  plantInfo?: PlantInfo[];
}

export interface PollenForecastResponse {
  regionCode?: string;
  dailyInfo?: PollenDayInfo[];
}

export interface LatLngBox {
  sw: LatLngLiteral;
  ne: LatLngLiteral;
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
  solarPanelConfigs?: Array<{
    panelsCount?: number;
    yearlyEnergyDcKwh?: number;
  }>;
}

export interface SolarBuildingInsightsResponse {
  name?: string;
  center?: LatLngLiteral;
  boundingBox?: LatLngBox;
  imageryDate?: {
    year: number;
    month: number;
    day: number;
  };
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'BASE' | string;
  postalCode?: string;
  administrativeArea?: string;
  regionCode?: string;
  solarPotential?: SolarPotential;
}

export interface PlaceTextResult {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: LatLngLiteral;
}

export interface PlacesSearchTextResponse {
  places?: PlaceTextResult[];
}
