import * as fs from 'fs';
import * as path from 'path';
import * as signalR from '@microsoft/signalr';
import {
  toStudent, toSubject, toAchievement, toTeacher, toHomework, toExam, toGrade, toAnnouncement,
  toNotice, toChatThread, toChatMessage, toChild, toFee, toPTM, toTransport, toLeaveRequest,
} from '@/services/http/mappers';
import { call, login } from './lib/api';
import { evaluate, type Expect } from './lib/evaluate';
import { formatTable, saveRaw, type CheckResult } from './lib/report';
import { requiredKeys } from './lib/requiredKeys';

// `process.loadEnvFile` (Node's built-in loader) is a documented no-op inside Jest's
// vm-sandboxed process object — it reports success but never mutates the env the test
// file reads back. Parse and assign directly instead; that assignment is reliable here.
function loadEnvFile(p: string): void {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(path.resolve(__dirname, '.env'));
const BASE = (process.env.API_BASE_URL ?? '').replace(/\/$/, '');
const WRITES = process.env.CONTRACT_WRITES === '1';
const results: CheckResult[] = [];

type Ctx = { role: string; token: string };
type Row = Record<string, any>;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const FROM = ymd(new Date(today.getTime() - 90 * 86400000));
const TO = ymd(today);

// Never throws: an HTTP or network failure becomes a FAIL row and the run continues.
async function probe(ctx: Ctx, name: string, p: string, expect: Expect, init?: RequestInit): Promise<any> {
  try {
    const { status, raw } = await call(BASE, ctx.token, p, init);
    saveRaw(ctx.role, name, raw);
    const required = expect.dto ? requiredKeys(expect.dto) : expect.keys ?? [];
    const r = evaluate(status, raw, expect, required);
    results.push({ role: ctx.role, name, path: p, status: r.status, notes: r.notes });
    return r.status === 'FAIL' ? undefined : r.data;
  } catch (e) {
    results.push({ role: ctx.role, name, path: p, status: 'FAIL', notes: [`request threw: ${(e as Error).message}`] });
    return undefined;
  }
}

async function perStudent(ctx: Ctx, sid: string, tag: string) {
  const q = `student_id=${encodeURIComponent(sid)}`;
  const s = encodeURIComponent(sid);
  await probe(ctx, `${tag}timetable`, `/students/${s}/timetable`, { kind: 'list', dto: 'TimetableSlotDTO' });
  const subjects: Row[] | undefined = await probe(ctx, `${tag}subjects`, `/subjects?${q}`, { kind: 'list', dto: 'SubjectDTO', map: toSubject });
  if (subjects?.[0]) await probe(ctx, `${tag}subject`, `/subjects/${subjects[0].id}`, { kind: 'object', dto: 'SubjectDTO', map: toSubject });
  await probe(ctx, `${tag}achievements`, `/achievements?${q}`, { kind: 'list', dto: 'AchievementDTO', map: toAchievement, allowEmpty: true });
  const hw: Row[] | undefined = await probe(ctx, `${tag}homework`, `/homework?${q}`, { kind: 'list', dto: 'HomeworkDTO', map: toHomework });
  if (hw?.[0]) await probe(ctx, `${tag}homework-one`, `/homework/${hw[0].id}`, { kind: 'object', dto: 'HomeworkDTO', map: toHomework });
  await probe(ctx, `${tag}grades`, `/grades?${q}`, { kind: 'list', dto: 'GradeDTO', map: toGrade });
  await probe(ctx, `${tag}exam-papers`, `/exam-papers?${q}`, { kind: 'list', dto: 'ExamPaperDTO', map: toExam });
  await probe(ctx, `${tag}attendance`, `/students/${s}/attendance?from=${FROM}&to=${TO}`, { kind: 'list', dto: 'AttendanceRecordDTO' });
  await probe(ctx, `${tag}attendance-periods`, `/students/${s}/attendance/periods?from=${FROM}&to=${TO}`, { kind: 'list', dto: 'AttendanceRecordDTO', allowEmpty: true });
  await probe(ctx, `${tag}attendance-summary`, `/students/${s}/attendance/summary?from=${FROM}&to=${TO}`, { kind: 'object' });
  await probe(ctx, `${tag}fees`, `/fees/invoices?${q}`, { kind: 'list', dto: 'FeeInvoiceDTO', map: toFee });
  await probe(ctx, `${tag}leave`, `/leave?${q}`, { kind: 'list', dto: 'LeaveRequestDTO', map: toLeaveRequest, allowEmpty: true });
}

async function common(ctx: Ctx, audience: 'student' | 'parent') {
  await probe(ctx, 'announcements', `/announcements?audience=${audience}`, { kind: 'list', dto: 'AnnouncementDTO', map: toAnnouncement });
  await probe(ctx, 'notifications', '/notifications', { kind: 'list', dto: 'NotificationDTO', map: toNotice, allowEmpty: true });
  await probe(ctx, 'settings', '/me/settings', { kind: 'object', dto: 'AppSettingsDTO' });
  const threads: Row[] | undefined = await probe(ctx, 'threads', '/threads', { kind: 'list', dto: 'ChatThreadDTO', map: toChatThread, allowEmpty: true });
  if (threads?.[0]) await probe(ctx, 'thread-messages', `/threads/${threads[0].id}/messages`, { kind: 'list', dto: 'ChatMessageDTO', map: toChatMessage, allowEmpty: true });
  await probe(ctx, 'teachers', '/teachers', { kind: 'list', dto: 'TeacherDTO', map: toTeacher });
  const buses: Row[] | undefined = await probe(ctx, 'bus', '/me/children/bus', { kind: 'list', dto: 'ChildBusPositionDTO', map: toTransport, allowEmpty: true });
  const routeId = buses?.find((b) => b.route_id)?.route_id;
  if (routeId) await probe(ctx, 'route-geometry', `/transport/routes/${routeId}/geometry`, { kind: 'object', keys: ['route_id', 'status'] });
  if (WRITES) await probe(ctx, 'notifications-read', '/notifications/read', { kind: 'object' }, { method: 'POST', body: '{}' });
}

async function hubCheck(ctx: Ctx, hub: string, invoke?: string) {
  const origin = BASE.replace(/\/v1$/, '');
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${origin}${hub}`, { accessTokenFactory: () => ctx.token })
    .configureLogging(signalR.LogLevel.None)
    .build();
  try {
    await conn.start();
    if (invoke) await conn.invoke(invoke);
    results.push({ role: ctx.role, name: `hub${hub}`, path: hub, status: 'PASS', notes: [] });
  } catch (e) {
    results.push({ role: ctx.role, name: `hub${hub}`, path: hub, status: 'FAIL', notes: [(e as Error).message] });
  } finally {
    await conn.stop();
  }
}

describe('live contract: sms-api + sms_dev', () => {
  beforeAll(() => {
    if (!BASE) throw new Error('API_BASE_URL missing: copy scripts/contract-check/.env.example to .env');
    if (jest.isMockFunction(globalThis.fetch)) throw new Error('fetch is mocked; the live check needs real network');
  });

  test('student', async () => {
    const ctx = { role: 'student', token: await login(BASE, process.env.STUDENT_IDENTIFIER!, process.env.STUDENT_PASSWORD!, 'student') };
    await probe(ctx, 'auth-me', '/auth/me', { kind: 'object', dto: 'SessionUserDTO' });
    const me: Row | undefined = await probe(ctx, 'students-me', '/students/me', { kind: 'object', dto: 'StudentDTO', map: toStudent });
    await probe(ctx, 'timetable-own', '/timetable', { kind: 'list', dto: 'TimetableSlotDTO' });
    if (me?.id) await perStudent(ctx, me.id, '');
    else results.push({ role: 'student', name: 'per-student', path: '-', status: 'FAIL', notes: ['no student id from /students/me; per-student checks skipped'] });
    await common(ctx, 'student');
    await hubCheck(ctx, '/hubs/live');
  });

  test('parent', async () => {
    const ctx = { role: 'parent', token: await login(BASE, process.env.PARENT_IDENTIFIER!, process.env.PARENT_PASSWORD!, 'parent') };
    await probe(ctx, 'auth-me', '/auth/me', { kind: 'object', dto: 'SessionUserDTO' });
    const kids: Row[] | undefined = await probe(ctx, 'children', '/parents/me/children', { kind: 'list', dto: 'StudentDTO', map: toChild });
    for (const [i, kid] of (kids ?? []).entries()) await perStudent(ctx, kid.id, `child${i + 1}-`);
    const ptm: Row[] | undefined = await probe(ctx, 'ptm', '/ptm', { kind: 'list', dto: 'PTMMeetingDTO', map: toPTM });
    if (WRITES && ptm?.[0]) {
      // Re-send the current status: exercises the write path without changing data.
      await probe(ctx, 'ptm-set-status', `/ptm/${ptm[0].id}`, { kind: 'object', dto: 'PTMMeetingDTO', map: toPTM },
        { method: 'PATCH', body: JSON.stringify({ status: ptm[0].status }) });
    }
    await common(ctx, 'parent');
    await hubCheck(ctx, '/hubs/live');
    await hubCheck(ctx, '/hubs/transport-fleet', 'JoinMyChildrenBuses');
  });

  afterAll(() => {
    console.log(`\n${formatTable(results)}\n`);
    const failed = results.filter((r) => r.status === 'FAIL').map((r) => `${r.role}/${r.name}`);
    expect(failed).toEqual([]);
  });
});
