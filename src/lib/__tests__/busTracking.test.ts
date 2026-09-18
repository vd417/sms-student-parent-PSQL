import {
  applyBusPositionPush,
  assignedStopLabel,
  assignmentMessage,
  boardingLabel,
  classLabel,
  parseBusPositionPush,
  stopProgressKind,
  trackingFromLegacy,
  trackingLabel,
  uniqueBusIds,
} from '../busTracking';
import type { Transport } from '@/models';

const base: Transport = {
  studentId: 's1',
  studentName: 'Aarav',
  grade: 'I',
  section: 'A',
  busId: 'bus-12',
  busNo: '12',
  routeName: 'Sector 62',
  status: 'on_route',
  trackingStatus: 'LIVE',
  motion: 'moving',
  assignment: 'assigned',
  driver: 'Raj',
  driverPhone: null,
  boardingState: 'boarded',
  etaNextStopMin: 6,
  currentStopIndex: 2,
  currentStopName: 'Sector 63',
  passedStopCount: 2,
  totalStops: 5,
  lat: 28.6,
  lng: 77.3,
  speedKmh: 22,
  nextStopName: 'Sector 64',
  lastPingAt: '2026-09-18T06:00:00Z',
  studentStopId: 'stop-4',
  studentStopName: 'Sector 62 Gate 2',
  studentStopLat: 28.61,
  studentStopLng: 77.31,
  distanceToStudentStopM: 900,
  routeStops: [],
};

describe('trackingFromLegacy', () => {
  it('maps the existing parent status vocabulary onto LIVE/DELAYED/OFFLINE', () => {
    expect(trackingFromLegacy('on_route')).toBe('LIVE');
    expect(trackingFromLegacy('at_stop')).toBe('LIVE');
    expect(trackingFromLegacy('delayed')).toBe('DELAYED');
    expect(trackingFromLegacy('idle')).toBe('OFFLINE');
  });
});

describe('classLabel / assignment / boarding', () => {
  it('formats class the way the parent card shows it', () => {
    expect(classLabel('I', 'A')).toBe('Class I - A');
    expect(classLabel('VI', '')).toBe('Class VI');
    expect(classLabel(null, null)).toBe('');
  });

  it('uses the production empty-state copy', () => {
    expect(assignmentMessage('none')).toBe('No school transport assigned.');
    expect(assignmentMessage('opted_out')).toBe('School transport not enabled.');
    expect(assignmentMessage('pending')).toBe('No active bus is currently assigned.');
  });

  it('labels the assigned stop for the logged-in audience', () => {
    expect(assignedStopLabel('parent')).toBe("Child's stop");
    expect(assignedStopLabel('student')).toBe('Your stop');
  });

  it('labels boarding from staff trip states', () => {
    expect(boardingLabel('boarded')).toBe('Picked up');
    expect(boardingLabel('dropped')).toBe('Dropped off');
    expect(boardingLabel(null)).toBeNull();
  });
});

describe('uniqueBusIds', () => {
  it('subscribes once when two children share a bus', () => {
    expect(uniqueBusIds([base, { ...base, studentId: 's2' }])).toEqual(['bus-12']);
  });

  it('tracks different buses independently', () => {
    expect(uniqueBusIds([base, { ...base, studentId: 's2', busId: 'bus-18' }])).toEqual([
      'bus-12',
      'bus-18',
    ]);
  });
});

describe('stopProgressKind / trackingLabel', () => {
  it('marks previous / current / remaining stops', () => {
    expect(stopProgressKind(0, 2)).toBe('passed');
    expect(stopProgressKind(2, 2)).toBe('current');
    expect(stopProgressKind(3, 2)).toBe('upcoming');
  });

  it('does not invent a stopped vs live distinction when the bus is offline', () => {
    expect(trackingLabel('OFFLINE', 'stopped')).toBe('OFFLINE');
    expect(trackingLabel('LIVE', 'stopped')).toBe('STOPPED');
    expect(trackingLabel('LIVE', 'moving')).toBe('LIVE');
  });
});

describe('parseBusPositionPush / applyBusPositionPush', () => {
  it('accepts the live hub snapshot field names', () => {
    const push = parseBusPositionPush({
      bus_id: 'bus-12',
      lat: 1,
      lng: 2,
      speed_kmh: 18,
      last_update_at: '2026-09-18T06:01:00Z',
      tracking_status: 'LIVE',
      motion: 'moving',
      next_stop_name: 'School',
    });
    expect(push?.last_ping_at).toBe('2026-09-18T06:01:00Z');
    const patched = applyBusPositionPush(
      [base, { ...base, studentId: 's2', busId: 'bus-18', lat: 9, lng: 9 }],
      push!,
    );
    expect(patched?.[0]).toMatchObject({ lat: 1, lng: 2, nextStopName: 'School', trackingStatus: 'LIVE' });
    expect(patched?.[1].lat).toBe(9);
  });

  it('rejects payloads without a bus id', () => {
    expect(parseBusPositionPush({ lat: 1 })).toBeNull();
  });
});
