import { noticeRefreshesTimetable, toastTextForNotice, shouldToastNotice } from '../noticeAlert';

describe('toastTextForNotice', () => {
  it('shows timetable publish as a school notice, not a chat line', () => {
    expect(
      toastTextForNotice({
        title: 'Timetable updated',
        body: '1 class · 30 periods with bell times — open Schedule to refresh.',
        tone: 'brand',
      }),
    ).toBe('Timetable updated. 1 class · 30 periods with bell times — open Schedule to refresh.');
  });

  it('keeps chat as sender: preview', () => {
    expect(toastTextForNotice({ title: 'Amit Yadav', body: 'Bring the notebook', tone: 'chat' })).toBe(
      'Amit Yadav: Bring the notebook',
    );
  });
});

describe('noticeRefreshesTimetable', () => {
  it('flags timetable notices', () => {
    expect(noticeRefreshesTimetable({ title: 'Timetable updated', body: '', tone: 'brand' })).toBe(true);
    expect(noticeRefreshesTimetable({ title: 'Homework: Maths', body: '', tone: 'brand' })).toBe(false);
  });
});

describe('shouldToastNotice', () => {
  const chat = { title: 'Amit', body: 'Hi', tone: 'chat' };
  const school = { title: 'Timetable updated', body: '', tone: 'brand' };

  it('honours in-app, chat, and school toggles', () => {
    expect(shouldToastNotice({ inAppToasts: false, chatAlerts: true, schoolNotices: true }, chat)).toBe(false);
    expect(shouldToastNotice({ inAppToasts: true, chatAlerts: false, schoolNotices: true }, chat)).toBe(false);
    expect(shouldToastNotice({ inAppToasts: true, chatAlerts: true, schoolNotices: true }, chat)).toBe(true);
    expect(shouldToastNotice({ inAppToasts: true, chatAlerts: true, schoolNotices: false }, school)).toBe(false);
    expect(shouldToastNotice({ inAppToasts: true, chatAlerts: false, schoolNotices: true }, school)).toBe(true);
  });

  it('does not toast chat while the thread is already open', () => {
    expect(
      shouldToastNotice({ inAppToasts: true, chatAlerts: true, schoolNotices: true }, chat, 'ChatThread'),
    ).toBe(false);
    expect(
      shouldToastNotice({ inAppToasts: true, chatAlerts: true, schoolNotices: true }, chat, 'InboxList'),
    ).toBe(true);
    expect(
      shouldToastNotice({ inAppToasts: true, chatAlerts: true, schoolNotices: true }, school, 'ChatThread'),
    ).toBe(true);
  });
});
