// Metro resolves `./BusMap` to BusMap.native.tsx / BusMap.web.tsx at bundle time for the
// real app; this bare file exists only so tsc (which doesn't do platform-extension
// resolution) has something to type-check against. It re-exports the web implementation
// as the safe universal fallback.
export { BusMap } from './BusMap.web';
export type { BusMapProps } from './BusMap.web';
