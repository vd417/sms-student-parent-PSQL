import Constants from 'expo-constants';

export type DataSource = 'mock' | 'http';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  dataSource?: DataSource;
  apiBaseUrl?: string;
};

// Global default. Per-domain overrides live in services/index.ts.
export const DATA_SOURCE: DataSource = extra.dataSource ?? 'mock';
export const API_BASE_URL: string = extra.apiBaseUrl ?? '';

// Mock tuning.
export const MOCK_LATENCY_MS = 350;
export const MOCK_ERROR_RATE = 0; // 0..1, set >0 to exercise error UI
