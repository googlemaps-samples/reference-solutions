export type UnitsSystem = 'IMPERIAL' | 'METRIC';
export type MapLayerType = 'roadmap' | 'hybrid';

export interface ActiveLocation {
  lat: number;
  lng: number;
  name: string;
  formattedAddress: string;
  placeId?: string;
  source: 'seed' | 'search' | 'map-click';
}

export const PHOENIX_SEED_LOCATION: ActiveLocation = {
  lat: 33.4484,
  lng: -112.074,
  name: 'Phoenix City Hall',
  formattedAddress: '200 W Washington St, Phoenix, AZ 85003, USA',
  source: 'seed',
};

export interface WeatherTemperature {
  degrees?: number;
  unit?: 'CELSIUS' | 'FAHRENHEIT';
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
    value?: number;
    unit?: string;
  };
  gust?: {
    value?: number;
    unit?: string;
  };
}

export interface WeatherPrecipitation {
  probability?: {
    percent?: number;
    type?: string;
  };
  qpf?: {
    quantity?: number;
    unit?: string;
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

export interface WeatherForecastDay {
  displayDate?: {
    year: number;
    month: number;
    day: number;
  };
  daytimeForecast?: {
    weatherCondition?: WeatherCondition;
    precipitation?: WeatherPrecipitation;
    wind?: WeatherWind;
    relativeHumidity?: number;
    uvIndex?: number;
    cloudCover?: number;
  };
  nighttimeForecast?: {
    weatherCondition?: WeatherCondition;
  };
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

export interface AqiColor {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

export interface AirQualityIndex {
  code?: string;
  displayName?: string;
  aqi?: number;
  aqiDisplay?: string;
  color?: AqiColor;
  category?: string;
  dominantPollutant?: string;
}

export interface AirQualityPollutant {
  code?: string;
  displayName?: string;
  fullName?: string;
  concentration?: {
    value?: number;
    units?: string;
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

export interface PollenIndexInfo {
  code?: string;
  displayName?: string;
  value?: number;
  category?: string;
  indexDescription?: string;
  color?: AqiColor;
}

export interface PollenTypeInfo {
  code?: 'TREE' | 'GRASS' | 'WEED' | string;
  displayName?: string;
  inSeason?: boolean;
  indexInfo?: PollenIndexInfo;
  healthRecommendations?: string[];
}

export interface PollenPlantInfo {
  code?: string;
  displayName?: string;
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

export interface SolarLatLng {
  latitude: number;
  longitude: number;
}

export interface SolarBuildingInsightsResponse {
  covered: boolean;
  message?: string;
  name?: string;
  center?: SolarLatLng;
  boundingBox?: {
    sw: SolarLatLng;
    ne: SolarLatLng;
  };
  imageryDate?: {
    year: number;
    month: number;
    day: number;
  };
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
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

export interface PlaceSearchResult {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: SolarLatLng;
}

export interface PanelFetchState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
}
