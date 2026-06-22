import type { DataSource } from '@/api/config';
import { DATA_SOURCE, MOCK_BACKED } from '@/api/config';
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
  if (source === 'mock') return mockServices();

  const http = httpServices;
  const mock = mockServices();

  // Compose at method level: student/parent are partially backed, so their
  // endpoint-less methods fall back to mock while the rest run live.
  const composed: Services = {
    // fully backed → live /v1
    auth: http.auth,
    subjects: http.subjects,
    homework: http.homework,
    grades: http.grades,
    announcements: http.announcements,
    messaging: http.messaging,
    directory: http.directory,
    fees: http.fees,
    leave: http.leave,
    // mixed: live profile/children, mock for endpoint-less methods
    student: {
      getProfile: http.student.getProfile,
      getToday: mock.student.getToday,
      getPeers: mock.student.getPeers,
      getAchievements: mock.student.getAchievements,
    },
    parent: {
      getProfile: http.parent.getProfile,
      children: http.parent.children,
      childToday: mock.parent.childToday,
    },
    // fully endpoint-less → mock
    school: mock.school,
    ptm: mock.ptm,
    transport: mock.transport,
    attendance: mock.attendance,
  };

  if (MOCK_BACKED.length) {
    console.info(
      `[data] live /v1 backend; mock-backed (no endpoint yet): ${MOCK_BACKED.join(', ')}`,
    );
  }
  return composed;
}

export const services: Services = buildServices();
