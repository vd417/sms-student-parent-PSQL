import { loginBody } from './api';

describe('loginBody', () => {
  it('uses email when the identifier contains @', () => {
    expect(loginBody('a@b.com', 'pw', 'parent')).toEqual({ email: 'a@b.com', password: 'pw', role: 'parent' });
  });
  it('uses phone for 7-15 digits', () => {
    expect(loginBody('9876543210', 'pw', 'parent')).toEqual({ phone: '9876543210', password: 'pw', role: 'parent' });
  });
  it('uses student_id otherwise', () => {
    expect(loginBody('ADM/2026/001', 'pw', 'student')).toEqual({ student_id: 'ADM/2026/001', password: 'pw', role: 'student' });
  });
});
