export type UnitsSystem = 'IMPERIAL' | 'METRIC'

export type BaseMapType = 'roadmap' | 'hybrid'

export interface SelectedLocation {
  name: string
  formattedAddress: string
  lat: number
  lng: number
  placeId?: string
  source: 'seed' | 'autocomplete' | 'map-click'
}

export interface WeatherTemperature {
  degrees?: number
  unit?: 'CELSIUS' | 'FAHRENHEIT' | string
}

export interface WeatherCondition {
  iconBaseUri?: string
  description?: {
    text?: string
    languageCode?: string
  }
  type?: string
}

export interface WeatherWind {
  direction?: {
    degrees?: number
    cardinal?: string
  }
  speed?: {
    value?: number
    unit?: string
  }
  gust?: {
    value?: number
    unit?: string
  }
}

export interface WeatherPrecipitation {
  probability?: {
    percent?: number
    type?: string
  }
  qpf?: {
    quantity?: number
    unit?: string
  }
}

export interface CurrentWeatherResponse {
  currentTime?: string
  timeZone?: {
    id?: string
  }
  isDaytime?: boolean
  weatherCondition?: WeatherCondition
  temperature?: WeatherTemperature
  feelsLikeTemperature?: WeatherTemperature
  relativeHumidity?: number
  uvIndex?: number
  wind?: WeatherWind
  precipitation?: WeatherPrecipitation
  cloudCover?: number
}

export interface ForecastDayPart {
  weatherCondition?: WeatherCondition
  precipitation?: WeatherPrecipitation
  relativeHumidity?: number
  uvIndex?: number
  wind?: WeatherWind
}

export interface ForecastDay {
  displayDate?: {
    year: number
    month: number
    day: number
  }
  daytimeForecast?: ForecastDayPart
  nighttimeForecast?: ForecastDayPart
  maxTemperature?: WeatherTemperature
  minTemperature?: WeatherTemperature
  feelsLikeMaxTemperature?: WeatherTemperature
  feelsLikeMinTemperature?: WeatherTemperature
}

export interface DailyForecastResponse {
  forecastDays?: ForecastDay[]
  timeZone?: {
    id?: string
  }
}

export interface RgbColor {
  red?: number
  green?: number
  blue?: number
  alpha?: number
}

export interface AirQualityIndexItem {
  code?: string
  displayName?: string
  aqi?: number
  aqiDisplay?: string
  color?: RgbColor
  category?: string
  dominantPollutant?: string
}

export interface AirQualityPollutant {
  code?: string
  displayName?: string
  fullName?: string
  concentration?: {
    value?: number
    units?: string
  }
  additionalInfo?: {
    sources?: string
    effects?: string
  }
}

export interface AirQualityHealthRecommendations {
  generalPopulation?: string
  elderly?: string
  lungDiseasePopulation?: string
  heartDiseasePopulation?: string
  athletes?: string
  pregnantWomen?: string
  children?: string
}

export interface AirQualityResponse {
  dateTime?: string
  regionCode?: string
  indexes?: AirQualityIndexItem[]
  pollutants?: AirQualityPollutant[]
  healthRecommendations?: AirQualityHealthRecommendations
}

export interface PollenIndexInfo {
  code?: string
  displayName?: string
  value?: number
  category?: string
  indexDescription?: string
  color?: RgbColor
}

export interface PollenTypeInfo {
  code: 'TREE' | 'GRASS' | 'WEED' | string
  displayName?: string
  inSeason?: boolean
  indexInfo?: PollenIndexInfo
  healthRecommendations?: string[]
}

export interface PollenPlantInfo {
  code?: string
  displayName?: string
  inSeason?: boolean
  indexInfo?: PollenIndexInfo
  plantDescription?: {
    type?: string
    family?: string
    season?: string
    crossReaction?: string
    picture?: string
  }
}

export interface PollenDayInfo {
  date?: {
    year: number
    month: number
    day: number
  }
  pollenTypeInfo?: PollenTypeInfo[]
  plantInfo?: PollenPlantInfo[]
}

export interface PollenForecastResponse {
  regionCode?: string
  dailyInfo?: PollenDayInfo[]
}

export interface SolarLatLngBox {
  sw: {
    latitude: number
    longitude: number
  }
  ne: {
    latitude: number
    longitude: number
  }
}

export interface SolarPanelConfig {
  panelsCount?: number
  yearlyEnergyDcKwh?: number
}

export interface SolarBuildingInsights {
  name?: string
  center?: {
    latitude: number
    longitude: number
  }
  boundingBox?: SolarLatLngBox
  imageryDate?: {
    year: number
    month: number
    day: number
  }
  imageryQuality?: string
  postalCode?: string
  administrativeArea?: string
  regionCode?: string
  solarPotential?: {
    maxArrayPanelsCount?: number
    panelCapacityWatts?: number
    panelHeightMeters?: number
    panelWidthMeters?: number
    panelLifetimeYears?: number
    maxArrayAreaMeters2?: number
    maxSunshineHoursPerYear?: number
    carbonOffsetFactorKgPerMwh?: number
    wholeRoofStats?: {
      areaMeters2?: number
      groundAreaMeters2?: number
    }
    solarPanelConfigs?: SolarPanelConfig[]
  }
}

export interface SolarFetchResult {
  status: 'ok' | 'non-coverage' | 'error'
  data: SolarBuildingInsights | null
  message?: string
}

export interface SectionState<T> {
  loading: boolean
  error: string | null
  data: T | null
}
