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
    lat: typeof row.lat === 'number' ? row.lat : null,
    lng: typeof row.lng === 'number' ? row.lng : null,
    speed_kmh: typeof row.speed_kmh === 'number' ? row.speed_kmh : typeof row.speedKmh === 'number' ? row.speedKmh : null,
    next_stop_name:
      typeof row.next_stop_name === 'string'
        ? row.next_stop_name
        : typeof row.nextStopName === 'string'
          ? row.nextStopName
          : null,
    last_ping_at: last,
    tracking_status: typeof tracking === 'string' ? tracking : null,
    motion: typeof motion === 'string' ? motion : null,
    eta_next_stop_min:
      typeof row.eta_next_stop_min === 'number'
        ? row.eta_next_stop_min
        : typeof row.etaNextStopMin === 'number'
          ? row.etaNextStopMin
          : null,
  };
}

function asTracking(value: string | null | undefined): TransportTrackingStatus | null {
  if (value === 'LIVE' || value === 'DELAYED' || value === 'OFFLINE') return value;
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
    if (!row.busId || row.busId !== push.bus_id) return row;
    const tracking = asTracking(push.tracking_status) ?? row.trackingStatus;
    const motion = asMotion(push.motion) ?? row.motion;
    return {
      ...row,
      lat: push.lat ?? row.lat,
      lng: push.lng ?? row.lng,
      speedKmh: push.speed_kmh ?? row.speedKmh,
      nextStopName: push.next_stop_name ?? row.nextStopName,
      lastPingAt: push.last_ping_at ?? row.lastPingAt,
      trackingStatus: tracking,
      motion,
      etaNextStopMin: tracking === 'LIVE' ? (push.eta_next_stop_min ?? row.etaNextStopMin) : null,
      status:
        tracking === 'LIVE'
          ? motion === 'stopped'
            ? 'at_stop'
            : 'on_route'
          : tracking === 'DELAYED'
            ? 'delayed'
            : 'idle',
    };
  });
}
