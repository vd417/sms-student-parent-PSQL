import {
  goToLatestNotice,
  goToNotice,
  inboxTabBadge,
  noticeDestination,
  noticeKind,
  unreadChatCount,
  unreadNoticeCount,
} from '../noticeRoute';

describe('noticeKind', () => {
  it('maps chat, bus, fees, homework, and school notices', () => {
    expect(noticeKind({ tone: 'chat', title: 'Amit' })).toBe('chat');
    expect(noticeKind({ role: 'message', title: 'Amit' })).toBe('chat');
    expect(noticeKind({ tone: 'bus', title: 'Bus started' })).toBe('bus');
    expect(noticeKind({ tone: 'fees', title: 'Fee due' })).toBe('fees');
    expect(noticeKind({ tone: 'brand', title: 'Homework: Maths' })).toBe('homework');
    expect(noticeKind({ tone: 'brand', title: 'Term 4 fee window now open' })).toBe('fees');
    expect(noticeKind({ tone: 'brand', title: 'Timetable updated' })).toBe('timetable');
    expect(noticeKind({ tone: 'brand', title: 'Holiday' })).toBe('school');
    expect(noticeKind({ tone: 'warn', title: 'Ankit marked absent' })).toBe('attendance');
  });
});

describe('noticeDestination', () => {
  it('sends chat to Inbox and school alerts to Notices', () => {
    expect(noticeDestination('chat', 'student')).toEqual({ tab: 'Inbox' });
    expect(noticeDestination('school', 'student')).toEqual({ stack: 'Announcements' });
    expect(noticeDestination('bus', 'parent')).toEqual({ stack: 'Transport' });
    expect(noticeDestination('fees', 'parent')).toEqual({ tab: 'Fees' });
    expect(noticeDestination('homework', 'student')).toEqual({ tab: 'Homework' });
    expect(noticeDestination('homework', 'parent')).toEqual({ tab: 'Class' });
    expect(noticeDestination('attendance', 'parent')).toEqual({ stack: 'Attendance' });
  });
});

describe('unread counts', () => {
  it('sums chat unread onto Inbox and all unread notices onto the bell', () => {
    expect(unreadChatCount([{ unread: 2 }, { unread: 1 }, { unread: 0 }])).toBe(3);
    expect(
      unreadNoticeCount([
        { unread: true, tone: 'chat', title: 'Amit', body: 'Hi' },
        { unread: true, tone: 'bus', title: 'Bus started', body: '' },
        { unread: true, tone: 'brand', title: 'Fee due', body: '' },
        { unread: false, tone: 'brand', title: 'Holiday', body: '' },
      ]),
    ).toBe(3);
    expect(inboxTabBadge(0)).toBeUndefined();
    expect(inboxTabBadge(4)).toBe(4);
    expect(inboxTabBadge(120)).toBe('99+');
  });
});

describe('goToNotice', () => {
  it('opens a tab or a stack screen from the map', () => {
    const navigate = jest.fn();
    goToNotice({ navigate }, 'chat', 'student');
    expect(navigate).toHaveBeenCalledWith('Main', { screen: 'Inbox' });
    goToNotice({ navigate }, 'bus', 'parent');
    expect(navigate).toHaveBeenCalledWith('Transport');
  });

  it('opens Notices from the bell, not Attendance or Inbox', () => {
    const navigate = jest.fn();
    goToLatestNotice(
      { navigate },
      [{ unread: true, tone: 'warn', title: 'Rahul Sharma marked absent', body: 'Physics' }],
      'parent',
    );
    expect(navigate).toHaveBeenCalledWith('Announcements');
    expect(navigate).not.toHaveBeenCalledWith('Attendance');
    goToLatestNotice(
      { navigate },
      [{ unread: true, tone: 'chat', title: 'Amit', body: 'Hi' }],
      'student',
    );
    expect(navigate).toHaveBeenLastCalledWith('Announcements');
  });

  it('opens Attendance when the parent taps an absent notice row', () => {
    const navigate = jest.fn();
    goToNotice({ navigate }, 'attendance', 'parent');
    expect(navigate).toHaveBeenCalledWith('Attendance');
  });
});
