import { liveHubUrl, liveEventQueryKeys, liveEventType } from '../liveEvents';

describe('liveHubUrl', () => {
  it('strips the /v1 API prefix so the hub sits on the API origin', () => {
    expect(liveHubUrl('http://localhost:5162/v1')).toBe('http://localhost:5162/hubs/live');
    expect(liveHubUrl('http://localhost:5162/v1/')).toBe('http://localhost:5162/hubs/live');
  });
});

describe('liveEventQueryKeys', () => {
  it('maps attendance to today and attendance caches', () => {
    const keys = liveEventQueryKeys('attendance').map((k) => k.join('.'));
    expect(keys).toEqual(expect.arrayContaining([
      'parent.today',
      'parent.attendance',
      'student.today',
    ]));
  });

  it('maps chat, homework, grades, and announcements', () => {
    expect(liveEventQueryKeys('chat').some((k) => k[0] === 'threads')).toBe(true);
    expect(liveEventQueryKeys('homework').some((k) => k[0] === 'homework')).toBe(true);
    expect(liveEventQueryKeys('grades').some((k) => k[0] === 'grades')).toBe(true);
    expect(liveEventQueryKeys('announcement').some((k) => k[0] === 'announcements')).toBe(true);
  });

  it('accepts PascalCase payloads from SignalR', () => {
    expect(liveEventType({ Type: 'Attendance' })).toBe('attendance');
    expect(liveEventType({ type: 'chat' })).toBe('chat');
  });
});
