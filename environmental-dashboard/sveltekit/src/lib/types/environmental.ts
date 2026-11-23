export type UnitsSystem = 'IMPERIAL' | 'METRIC';
export type BaseMapType = 'roadmap' | 'hybrid';

export interface ActiveLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  source: 'seed' | 'search' | 'map-click';
}

export interface WeatherTemperature {
  unit?: 'FAHRENHEIT' | 'CELSIUS' | string;
  degrees?: number;
}

export interface WeatherCurrentResponse {
  currentTime?: string;
  timeZone?: {
    id?: string;
  };
  isDaytime?: boolean;
  weatherCondition?: {
    iconBaseUri?: string;
    description?: {
      text?: string;
      languageCode?: string;
    };
    type?: string;
  };
  temperature?: WeatherTemperature;
  feelsLikeTemperature?: WeatherTemperature;
  relativeHumidity?: number;
  uvIndex?: number;
  cloudCover?: number;
  wind?: {
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
  };
  precipitation?: {
    probability?: {
      type?: string;
      percent?: number;
    };
    qpf?: {
      quantity?: number;
      unit?: string;
    };
  };
}

export interface WeatherForecastDay {
  displayDate?: {
    year: number;
    month: number;
    day: number;
  };
  daytimeForecast?: {
    weatherCondition?: {
      iconBaseUri?: string;
      description?: {
        text?: string;
      };
      type?: string;
    };
    precipitation?: {
      probability?: {
        percent?: number;
        type?: string;
      };
    };
    uvIndex?: number;
    relativeHumidity?: number;
  };
  maxTemperature?: WeatherTemperature;
  minTemperature?: WeatherTemperature;
}

export interface WeatherForecastResponse {
  forecastDays?: WeatherForecastDay[];
  timeZone?: {
    id?: string;
  };
}

export interface AirQualityIndexItem {
  code?: string;
  displayName?: string;
  aqi?: number;
  aqiDisplay?: string;
  color?: {
    red?: number;
    green?: number;
    blue?: number;
    alpha?: number;
  };
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

export interface AirQualityCurrentResponse {
  dateTime?: string;
  regionCode?: string;
  indexes?: AirQualityIndexItem[];
  pollutants?: AirQualityPollutant[];
  healthRecommendations?: Record<string, string>;
}

export interface PollenTypeInfo {
  code?: 'TREE' | 'GRASS' | 'WEED' | string;
  displayName?: string;
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
  code?: string;
  displayName?: string;
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

export interface SolarBuildingInsightsResponse {
  name?: string;
  center?: {
    latitude: number;
    longitude: number;
  };
  boundingBox?: {
    sw: {
      latitude: number;
      longitude: number;
    };
    ne: {
      latitude: number;
      longitude: number;
    };
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
      sunshineQuantiles?: number[];
      groundAreaMeters2?: number;
    };
    solarPanelConfigs?: Array<{
      panelsCount?: number;
      yearlyEnergyDcKwh?: number;
    }>;
  };
  nonCoverage?: boolean;
  message?: string;
}

export interface EnvironmentalPanelState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
