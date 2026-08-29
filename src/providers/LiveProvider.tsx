import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, DATA_SOURCE } from '@/api/config';
import { getAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { useAuth } from '@/providers/AuthProvider';
import { liveEventQueryKeys, liveEventType, liveHubUrl } from '@/lib/liveEvents';

type LiveStatus = { connected: boolean };

type LiveConnection = {
  on: (event: string, cb: (payload: unknown) => void) => void;
  onreconnected: (cb: () => void) => void;
  onclose: (cb: () => void) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  off: (event: string) => void;
};

const LiveContext = createContext<LiveStatus>({ connected: false });

export function useLive(): LiveStatus {
  return useContext(LiveContext);
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || DATA_SOURCE !== 'http' || !API_BASE_URL) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    let connection: LiveConnection | undefined;

    void (async () => {
      try {
        // Load after login so a SignalR/Metro failure cannot blank Welcome/Login.
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
          const type = liveEventType(payload);
          for (const queryKey of liveEventQueryKeys(type)) {
            void qc.invalidateQueries({ queryKey });
          }
        });
        conn.onreconnected(() => setConnected(true));
        conn.onclose(() => setConnected(false));
        connection = conn;
        await conn.start();
        if (!cancelled) setConnected(true);
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
  }, [status, qc]);

  return <LiveContext.Provider value={{ connected }}>{children}</LiveContext.Provider>;
}
