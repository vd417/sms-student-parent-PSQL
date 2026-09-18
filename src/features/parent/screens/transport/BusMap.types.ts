export type BusMapStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  yours?: boolean;
  passed?: boolean;
};

export type BusMapProps = {
  lat: number | null;
  lng: number | null;
  busNo: string;
  trackingStatus?: 'LIVE' | 'DELAYED' | 'OFFLINE';
  motion?: 'moving' | 'stopped' | null;
  studentStop?: BusMapStop | null;
  stops?: BusMapStop[];
  interactive?: boolean;
  fullscreen?: boolean;
  onPress?: () => void;
  onRecenterReady?: (recenter: () => void) => void;
};
