import type { Services } from '@/services/types';
import { NotImplementedError } from '@/services/errors';

const ni = (what: string) => {
  throw new NotImplementedError(what);
};

export const httpServices: Services = {
  school: { getCurrent: () => ni('school.getCurrent') },
  auth: {
    signIn: () => ni('auth.signIn'),
    signOut: () => ni('auth.signOut'),
  },
  student: {
    getProfile: () => ni('student.getProfile'),
    getToday: () => ni('student.getToday'),
    getPeers: () => ni('student.getPeers'),
    getAchievements: () => ni('student.getAchievements'),
  },
  subjects: { list: () => ni('subjects.list'), byId: () => ni('subjects.byId') },
  homework: {
    list: () => ni('homework.list'),
    byId: () => ni('homework.byId'),
    setStatus: () => ni('homework.setStatus'),
    submit: () => ni('homework.submit'),
  },
  grades: { listGrades: () => ni('grades.listGrades'), listExams: () => ni('grades.listExams') },
  announcements: { list: () => ni('announcements.list') },
  messaging: {
    threads: () => ni('messaging.threads'),
    messages: () => ni('messaging.messages'),
    send: () => ni('messaging.send'),
  },
  directory: { teachers: () => ni('directory.teachers') },
  parent: {
    getProfile: () => ni('parent.getProfile'),
    children: () => ni('parent.children'),
    childToday: () => ni('parent.childToday'),
  },
  fees: { list: () => ni('fees.list'), pay: () => ni('fees.pay') },
  ptm: { list: () => ni('ptm.list'), setStatus: () => ni('ptm.setStatus') },
  transport: { forChild: () => ni('transport.forChild') },
  attendance: { month: () => ni('attendance.month') },
  leave: { list: () => ni('leave.list'), submit: () => ni('leave.submit') },
};
