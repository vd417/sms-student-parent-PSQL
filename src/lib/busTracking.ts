import type {
  Transport,
  TransportAssignment,
  TransportMotion,
  TransportStatus,
  TransportTrackingStatus,
} from '@/models';

export function trackingFromLegacy(status: TransportStatus): TransportTrackingStatus {
  if (status === 'on_route' || status === 'at_stop') return 'LIVE';
  if (status === 'delayed') return 'DELAYED';
  return 'OFFLINE';
}

export function classLabel(grade?: string | null, section?: string | null): string {
  const g = (grade ?? '').trim();
  const s = (section ?? '').trim();
  if (g && s) return `Class ${g} - ${s}`;
  if (g) return `Class ${g}`;
  return '';
}

export function uniqueBusIds(rows: Transport[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.busId || seen.has(row.busId)) continue;
    seen.add(row.busId);
    ids.push(row.busId);
  }
  return ids;
}

export function trackingLabel(
  tracking: TransportTrackingStatus,
  motion: TransportMotion | null,
): string {
  if (tracking === 'LIVE') return motion === 'stopped' ? 'STOPPED' : 'LIVE';
  return tracking;
}

export function assignedStopLabel(audience: 'parent' | 'student'): string {
  return audience === 'student' ? 'Your stop' : "Child's stop";
}

/** Last stop on the route, else the live next stop / route name. */
export function routeDestinationName(
  tr: Pick<Transport, 'routeStops' | 'nextStopName' | 'routeName'>,
): string | null {
  const last = tr.routeStops.length ? (tr.routeStops[tr.routeStops.length - 1]?.name ?? '').trim() : '';
  if (last) return last;
  const next = (tr.nextStopName ?? '').trim();
  if (next) return next;
  const route = (tr.routeName ?? '').trim();
  return route || null;
}

export function assignmentMessage(assignment: TransportAssignment): string {
  if (assignment === 'opted_out') return 'School transport not enabled.';
  if (assignment === 'pending') return 'No active bus is currently assigned.';
  if (assignment === 'none') return 'No school transport assigned.';
  return '';
}

export function boardingLabel(state: string | null): string | null {
  if (!state) return null;
  const key = state.trim().toLowerCase();
  if (key === 'boarded') return 'Picked up';
  if (key === 'dropped') return 'Dropped off';
  if (key === 'absent') return 'Marked absent';
  return state;
}

export function stopProgressKind(
  seqIndex: number,
  currentStopIndex: number | null,
): 'passed' | 'current' | 'upcoming' {
  if (currentStopIndex == null) return 'upcoming';
  if (seqIndex < currentStopIndex) return 'passed';
  if (seqIndex === currentStopIndex) return 'current';
  return 'upcoming';
}

export type BusPositionPush = {
  bus_id: string;
  lat?: number | null;
  lng?: number | null;
  speed_kmh?: number | null;
  next_stop_name?: string | null;
  last_ping_at?: string | null;
  last_update_at?: string | null;
  status?: string | null;
  tracking_status?: string | null;
  motion?: string | null;
  eta_next_stop_min?: number | null;
};

function asCoord(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function parseBusPositionPush(payload: unknown): BusPositionPush | null {
  if (!payload || typeof payload !== 'object') return null;
  const row = payload as Record<string, unknown>;
  const busId = row.bus_id ?? row.busId;
  if (typeof busId !== 'string' || !busId.trim()) return null;
  const tracking = row.tracking_status ?? row.trackingStatus;
  const motion = row.motion;
  const last =
    (typeof row.last_ping_at === 'string' && row.last_ping_at) ||
    (typeof row.last_update_at === 'string' && row.last_update_at) ||
    (typeof row.lastPingAt === 'string' && row.lastPingAt) ||
    (typeof row.lastUpdateAt === 'string' && row.lastUpdateAt) ||
    null;
  return {
    bus_id: busId.trim(),
    lat: asCoord(row.lat ?? row.latitude),
    lng: asCoord(row.lng ?? row.longitude),
    speed_kmh: asCoord(row.speed_kmh ?? row.speedKmh),
    next_stop_name:
      typeof row.next_stop_name === 'string'
        ? row.next_stop_name
        : typeof row.nextStopName === 'string'
          ? row.nextStopName
          : null,
    last_ping_at: last,
    status: typeof row.status === 'string' ? row.status : null,
    tracking_status: typeof tracking === 'string' ? tracking : null,
    motion: typeof motion === 'string' ? motion : null,
    eta_next_stop_min: asCoord(row.eta_next_stop_min ?? row.etaNextStopMin),
  };
}

const LIVE_MS = 60_000;
const DELAYED_MS = 5 * 60_000;

/** Match the teacher app: a GPS point from the last minute is LIVE, even if the list payload still says OFFLINE. */
export function presentTransport(row: Transport, now = Date.now()): Transport {
  if (row.lat == null || row.lng == null || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return row;
  const ping = row.lastPingAt ? Date.parse(row.lastPingAt) : NaN;
  if (!Number.isFinite(ping)) return row;
  const age = now - ping;
  const moving = typeof row.speedKmh === 'number' && row.speedKmh > 3;
  const motion: TransportMotion = moving ? 'moving' : (row.motion ?? 'stopped');
  const fresh = age <= LIVE_MS || (age < 0 && age > -12 * 60 * 60_000);
  if (fresh) {
    return {
      ...row,
      trackingStatus: 'LIVE',
      motion,
      status: motion === 'stopped' ? 'at_stop' : 'on_route',
    };
  }
  if (age <= DELAYED_MS && row.trackingStatus === 'OFFLINE') {
    return { ...row, trackingStatus: 'DELAYED', motion, status: 'delayed' };
  }
  return row;
}

/** A later list refresh must not wipe a live GPS point that just arrived on the socket. */
export function mergeTransportRows(prev: Transport[] | undefined, next: Transport[], now = Date.now()): Transport[] {
  return next.map((row) => {
    const old = prev?.find(
      (item) =>
        item.studentId === row.studentId ||
        (Boolean(item.busId) && item.busId?.trim().toLowerCase() === row.busId?.trim().toLowerCase()),
    );
    if (!old || old.lat == null || old.lng == null) return presentTransport(row, now);
    const oldPing = old.lastPingAt ? Date.parse(old.lastPingAt) : NaN;
    const newPing = row.lastPingAt ? Date.parse(row.lastPingAt) : NaN;
    const oldFresh = Number.isFinite(oldPing) && now - oldPing <= DELAYED_MS;
    const incomingMissing = row.lat == null || row.lng == null;
    const oldNewer = Number.isFinite(oldPing) && (!Number.isFinite(newPing) || oldPing > newPing);
    const merged =
      oldFresh && (incomingMissing || oldNewer)
        ? {
            ...row,
            lat: old.lat,
            lng: old.lng,
            speedKmh: old.speedKmh ?? row.speedKmh,
            lastPingAt: old.lastPingAt,
            motion: old.motion ?? row.motion,
            trackingStatus: old.trackingStatus,
            status: old.status,
          }
        : row;
    return presentTransport(merged, now);
  });
}

function asTracking(value: string | null | undefined): TransportTrackingStatus | null {
  if (value === 'LIVE' || value === 'DELAYED' || value === 'OFFLINE') return value;
  const key = value?.trim().toLowerCase();
  if (key === 'live') return 'LIVE';
  if (key === 'delayed') return 'DELAYED';
  if (key === 'offline') return 'OFFLINE';
  return null;
}

function trackingFromPushStatus(status: string | null | undefined): TransportTrackingStatus | null {
  const key = status?.trim().toLowerCase();
  if (key === 'moving' || key === 'stopped' || key === 'live' || key === 'on_route' || key === 'at_stop') return 'LIVE';
  if (key === 'delayed') return 'DELAYED';
  return null;
}

function asMotion(value: string | null | undefined): TransportMotion | null {
  if (value === 'moving' || value === 'stopped') return value;
  return null;
}

/** Patch live GPS onto every child row that shares this bus — one subscription, many children. */
export function applyBusPositionPush(rows: Transport[] | undefined, push: BusPositionPush): Transport[] | undefined {
  if (!rows) return rows;
  return rows.map((row) => {
    if (!row.busId || row.busId.trim().toLowerCase() !== push.bus_id.trim().toLowerCase()) return row;
    const fromLabel = asTracking(push.tracking_status);
    const fromMotion = trackingFromPushStatus(push.status) ?? trackingFromPushStatus(push.motion);
    const hasGps = push.lat != null && push.lng != null;
    // A moving/stopped fix with coordinates is the live bus, even when the list label is still OFFLINE.
    const tracking = (hasGps && fromMotion === 'LIVE' ? fromMotion : null) ?? fromLabel ?? fromMotion ?? row.trackingStatus;
    const motion = asMotion(push.motion) ?? row.motion;
    const status: TransportStatus =
      tracking === 'LIVE' ? (motion === 'stopped' ? 'at_stop' : 'on_route') : tracking === 'DELAYED' ? 'delayed' : 'idle';
    const next: Transport = {
      ...row,
      lat: push.lat ?? row.lat,
      lng: push.lng ?? row.lng,
      speedKmh: push.speed_kmh ?? row.speedKmh,
      nextStopName: push.next_stop_name ?? row.nextStopName,
      lastPingAt: push.last_ping_at ?? row.lastPingAt,
      trackingStatus: tracking,
      motion,
      etaNextStopMin: tracking === 'LIVE' ? (push.eta_next_stop_min ?? row.etaNextStopMin) : null,
      status,
    };
    return presentTransport(next);
  });
}
