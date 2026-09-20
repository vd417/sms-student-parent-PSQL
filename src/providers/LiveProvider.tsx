import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, DATA_SOURCE } from '@/api/config';
import { getAuthToken } from '@/api/client';
import { getNetworkSnapshot, subscribeNetwork } from '@/api/network';
import { tokenStore } from '@/services/auth/tokenStore';
import { useAuth } from '@/providers/AuthProvider';
import { liveEventQueryKeys, liveEventType, liveHubUrl } from '@/lib/liveEvents';

type LiveStatus = { connected: boolean; lastEventAt: number | null };

type LiveConnection = {
  on: (event: string, cb: (payload: unknown) => void) => void;
  onreconnected: (cb: () => void) => void;
  onclose: (cb: () => void) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  off: (event: string) => void;
};

const LiveContext = createContext<LiveStatus>({ connected: false, lastEventAt: null });

export function useLive(): LiveStatus {
  return useContext(LiveContext);
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [online, setOnline] = useState(getNetworkSnapshot().online);

  useEffect(() => subscribeNetwork((snap) => setOnline(snap.online)), []);

  useEffect(() => {
    if (status !== 'authenticated' || DATA_SOURCE !== 'http' || !API_BASE_URL || !online) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    let connection: LiveConnection | undefined;

    void (async () => {
      try {
        const signalR = await import('@microsoft/signalr');
        if (cancelled) return;
        const conn: LiveConnection = new signalR.HubConnectionBuilder()
          .withUrl(liveHubUrl(API_BASE_URL), {
            accessTokenFactory: async () =>
              getAuthToken() || (await tokenStore.load())?.access || '',
            withCredentials: false,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.None)
          .build();

        conn.on('live_event', (payload: unknown) => {
          setLastEventAt(Date.now());
          const type = liveEventType(payload);
          for (const queryKey of liveEventQueryKeys(type)) {
            void qc.invalidateQueries({ queryKey });
          }
        });
        conn.onreconnected(() => setConnected(true));
        conn.onclose(() => setConnected(false));
        connection = conn;
        await conn.start();
        if (cancelled) {
          conn.off('live_event');
          void conn.stop();
          return;
        }
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      setConnected(false);
      if (connection) {
        connection.off('live_event');
        void connection.stop();
      }
    };
  }, [status, qc, online]);

  return <LiveContext.Provider value={{ connected, lastEventAt }}>{children}</LiveContext.Provider>;
}
