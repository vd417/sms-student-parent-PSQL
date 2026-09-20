import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, DATA_SOURCE } from '@/api/config';
import { getAuthToken } from '@/api/client';
import { getNetworkSnapshot, subscribeNetwork } from '@/api/network';
import { tokenStore } from '@/services/auth/tokenStore';
import { useAuth } from '@/providers/AuthProvider';
import { transportFleetHubUrl } from '@/lib/liveEvents';
import { applyBusPositionPush, parseBusPositionPush } from '@/lib/busTracking';
import { qk } from '@/hooks/keys';
import type { Transport } from '@/models';

type FleetConnection = {
  on: (event: string, cb: (payload: unknown) => void) => void;
  off: (event: string) => void;
  onreconnected: (cb: () => void) => void;
  invoke: (method: string, ...args: unknown[]) => Promise<unknown>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  state: string;
};

const PUSH_EVENT = 'position_update';
const INVALIDATE_EVENTS = [
  'trip_started',
  'trip_ended',
  'status_changed',
  'stop_arrived',
  'stop_completed',
  'school_arrived',
];

/** One TransportFleetHub connection; JoinBus once per unique bus even if two children share it.
 *  Prefers JoinMyChildrenBuses when the hub supports it (server-resolved, authz-safe). */
export function useTransportFleetPush(busIds: string[]): { connected: boolean } {
  const { status } = useAuth();
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(getNetworkSnapshot().online);
  const busIdsKey = busIds.slice().sort().join(',');
  const wantedRef = useRef<string[]>(busIds);
  const syncRef = useRef<() => void>(() => {});

  wantedRef.current = busIds;
  useEffect(() => subscribeNetwork((snap) => setOnline(snap.online)), []);

  useEffect(() => {
    if (status !== 'authenticated' || DATA_SOURCE !== 'http' || !API_BASE_URL || !online) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    let connection: FleetConnection | undefined;
    const joined = new Set<string>();
    let preferServerJoin = true;

    void (async () => {
      try {
        const signalR = await import('@microsoft/signalr');
        if (cancelled) return;
        const conn = new signalR.HubConnectionBuilder()
          .withUrl(transportFleetHubUrl(API_BASE_URL), {
            accessTokenFactory: async () =>
              getAuthToken() || (await tokenStore.load())?.access || '',
            withCredentials: false,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.None)
          .build();

        const syncJoins = () => {
          if (conn.state !== signalR.HubConnectionState.Connected) return;
          if (preferServerJoin) {
            void conn.invoke('JoinMyChildrenBuses')
              .then((ids) => {
                joined.clear();
                const list = Array.isArray(ids) ? ids : [];
                for (const id of list) joined.add(String(id));
                // Also join any busIds from poll that server may have missed (legacy).
                for (const busId of wantedRef.current) {
                  if (!joined.has(busId)) {
                    joined.add(busId);
                    void conn.invoke('JoinBus', busId).catch(() => joined.delete(busId));
                  }
                }
              })
              .catch(() => {
                preferServerJoin = false;
                syncJoins();
              });
            return;
          }
          const wanted = new Set(wantedRef.current);
          for (const busId of Array.from(joined)) {
            if (!wanted.has(busId)) {
              joined.delete(busId);
              void conn.invoke('LeaveBus', busId).catch(() => {});
            }
          }
          for (const busId of wanted) {
            if (!joined.has(busId)) {
              joined.add(busId);
              void conn.invoke('JoinBus', busId).catch(() => joined.delete(busId));
            }
          }
        };
        syncRef.current = syncJoins;

        conn.on(PUSH_EVENT, (payload: unknown) => {
          const push = parseBusPositionPush(payload);
          if (!push) return;
          qc.setQueryData<Transport[] | undefined>(qk.transportList(), (prev) =>
            applyBusPositionPush(prev, push),
          );
        });
        for (const event of INVALIDATE_EVENTS) {
          conn.on(event, () => {
            void qc.invalidateQueries({ queryKey: qk.transportList() });
          });
        }
        conn.onreconnected(() => {
          setConnected(true);
          joined.clear();
          syncJoins();
        });
        connection = conn;
        await conn.start();
        if (cancelled) {
          conn.off(PUSH_EVENT);
          void conn.stop();
          return;
        }
        setConnected(true);
        syncJoins();
      } catch {
        if (!cancelled) setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      setConnected(false);
      syncRef.current = () => {};
      if (connection) {
        connection.off(PUSH_EVENT);
        for (const event of INVALIDATE_EVENTS) connection.off(event);
        void connection.stop();
      }
    };
  }, [status, qc, online]);

  useEffect(() => {
    syncRef.current();
  }, [busIdsKey]);

  return { connected };
}
