import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_BASE_URL, DATA_SOURCE } from '@/api/config';
import { getAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { useAuth } from '@/providers/AuthProvider';
import { liveEventQueryKeys, liveEventType, liveHubUrl } from '@/lib/liveEvents';

type LiveStatus = { connected: boolean };

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

    const connection = new HubConnectionBuilder()
      .withUrl(liveHubUrl(API_BASE_URL), {
        accessTokenFactory: async () =>
          getAuthToken() || (await tokenStore.load())?.access || '',
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    connection.on('live_event', (payload: unknown) => {
      const type = liveEventType(payload);
      for (const queryKey of liveEventQueryKeys(type)) {
        void qc.invalidateQueries({ queryKey });
      }
    });

    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    let cancelled = false;
    void connection
      .start()
      .then(() => {
        if (!cancelled) setConnected(true);
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });

    return () => {
      cancelled = true;
      setConnected(false);
      connection.off('live_event');
      void connection.stop();
    };
  }, [status, qc]);

  return <LiveContext.Provider value={{ connected }}>{children}</LiveContext.Provider>;
}
