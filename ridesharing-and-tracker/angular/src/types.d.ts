interface RuntimeEnvConfig {
  GOOGLE_MAPS_API_KEY?: string;
}

interface Window {
  __ENV__?: RuntimeEnvConfig;
}
