import Constants from 'expo-constants';

export type DataSource = 'mock' | 'http';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  dataSource?: DataSource;
  apiBaseUrl?: string;
  googleMapsApiKey?: string;
  googleMapId?: string;
};

// Global default data source. Per-domain/method composition lives in
// services/index.ts. Defaults to live HTTP; mock is opt-in for offline dev.
export const DATA_SOURCE: DataSource = extra.dataSource ?? 'http';

// Base URL carries the API version (ends in /v1). EAS preview can override
// this with EXPO_PUBLIC_API_BASE_URL. The shipped app uses production.
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || '';

// Web and native bus maps read this key and Cloud Map ID. Android also reads the
// same key from app.json's android.config.googleMaps.apiKey.
export const GOOGLE_MAPS_API_KEY: string =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || extra.googleMapsApiKey || '';
export const GOOGLE_MAP_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID || extra.googleMapId || '';

// Network tuning. Timeout is measured after a connection slot is acquired so
// Chrome's 6-connection-per-host queue does not abort waiting fetches as (canceled).
export const REQUEST_TIMEOUT_MS = 20000;
export const FETCH_MAX_INFLIGHT = 4;

// Mock tuning.
export const MOCK_LATENCY_MS = 350;
export const MOCK_ERROR_RATE = 0; // 0..1, set >0 to exercise error UI

// Features with no backing endpoint — served by mock, surfaced in the startup
// log. Each flips to live with a one-line change once the backend ships it.
export const MOCK_BACKED: readonly string[] = [];
