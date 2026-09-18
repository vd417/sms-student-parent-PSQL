import { ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { setNetworkSnapshot, type Connectivity } from '@/api/network';

const RECONNECT_DEBOUNCE_MS = 800;

function deviceOnline(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    let lastOnline = true;

    const apply = (online: boolean) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (!online) {
        lastOnline = false;
        onlineManager.setOnline(false);
        setNetworkSnapshot({ online: false, status: 'offline' });
        bump((n) => n + 1);
        return;
      }

      if (lastOnline) {
        onlineManager.setOnline(true);
        setNetworkSnapshot({ online: true, status: 'online' });
        return;
      }

      setNetworkSnapshot({ online: false, status: 'reconnecting' });
      bump((n) => n + 1);
      debounceRef.current = setTimeout(() => {
        lastOnline = true;
        onlineManager.setOnline(true);
        setNetworkSnapshot({ online: true, status: 'online' });
        bump((n) => n + 1);
      }, RECONNECT_DEBOUNCE_MS);
    };

    const unsub = NetInfo.addEventListener((state) => apply(deviceOnline(state)));
    void NetInfo.fetch().then((state) => apply(deviceOnline(state)));

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return children;
}

export type { Connectivity };
