import type { DataSource } from '@/api/config';
import { DATA_SOURCE } from '@/api/config';
import type { Services } from './types';
import { httpServices } from './http';
import {
  announcementsMock,
  directoryMock,
  gradesMock,
  messagingMock,
  studentMock,
  subjectsMock,
} from './mock/student.mock';
import { homeworkMock } from './mock/homework.mock';
import { schoolMock } from './mock/school.mock';
import { authMock } from './mock/auth.mock';
import {
  parentMock,
  feesMock,
  ptmMock,
  transportMock,
  attendanceMock,
  leaveMock,
} from './mock/parent.mock';

function mockServices(): Services {
  return {
    school: schoolMock(),
    auth: authMock(),
    student: studentMock(),
    subjects: subjectsMock(),
    homework: homeworkMock(),
    grades: gradesMock(),
    announcements: announcementsMock(),
    messaging: messagingMock(),
    directory: directoryMock(),
    parent: parentMock(),
    fees: feesMock(),
    ptm: ptmMock(),
    transport: transportMock(),
    attendance: attendanceMock(),
    leave: leaveMock(),
  };
}

export function buildServices(source: DataSource = DATA_SOURCE): Services {
  return source === 'http' ? httpServices : mockServices();
}

export const services: Services = buildServices();
