import Constants from 'expo-constants';

export type DataSource = 'mock' | 'http';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  dataSource?: DataSource;
  apiBaseUrl?: string;
};

// Global default data source. Per-domain/method composition lives in
// services/index.ts. Defaults to live HTTP; mock is opt-in for offline dev.
export const DATA_SOURCE: DataSource = extra.dataSource ?? 'http';

// Base URL carries the API version (ends in /v1). Per-environment values come
// from EAS env at build time; the app.json value is the dev default. Replace
// the placeholder host with the real backend origin before running against live.
export const API_BASE_URL: string = extra.apiBaseUrl ?? '';

// Network tuning.
export const REQUEST_TIMEOUT_MS = 15000;

// Mock tuning.
export const MOCK_LATENCY_MS = 350;
export const MOCK_ERROR_RATE = 0; // 0..1, set >0 to exercise error UI

// Features with no backing endpoint — served by mock, surfaced in the startup
// log. Each flips to live with a one-line change once the backend ships it.
export const MOCK_BACKED: readonly string[] = [];
