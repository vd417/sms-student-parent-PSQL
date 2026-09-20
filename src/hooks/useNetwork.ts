import { useEffect, useState } from 'react';
import { getNetworkSnapshot, subscribeNetwork, type NetworkSnapshot } from '@/api/network';

export function useNetwork(): NetworkSnapshot {
  const [snap, setSnap] = useState<NetworkSnapshot>(getNetworkSnapshot);
  useEffect(() => subscribeNetwork(setSnap), []);
  return snap;
}
