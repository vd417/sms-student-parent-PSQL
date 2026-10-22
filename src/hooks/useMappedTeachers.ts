import { useQuery } from '@tanstack/react-query';
import { classLabels, teachersForClass } from '@/lib/classTeachers';
import { services } from '@/services';
import { useAuth } from '@/providers/AuthProvider';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useChildren } from './useParent';
import { useDirectory } from './useDirectory';
import { qk } from './keys';

/** Class teacher plus teachers on this class timetable. Not the whole staff list. */
export function useMappedTeachers() {
  const { role } = useAuth();
  const isParent = role === 'parent';
  const { childId } = useSelectedChild();
  const childrenQ = useChildren();
  const teachersQ = useDirectory();
  const profileQ = useQuery({
    queryKey: qk.studentProfile(),
    queryFn: () => services.student.getProfile(),
    enabled: role === 'student',
  });
  const canLoadClass = role === 'student' || (isParent && Boolean(childId));
  const timetableQ = useQuery({
    queryKey: qk.timetable(isParent ? childId : undefined),
    queryFn: () => services.student.getTimetable(isParent ? childId : undefined),
    enabled: canLoadClass,
  });
  const subjectsQ = useQuery({
    queryKey: qk.subjects(isParent ? childId : undefined),
    queryFn: () => services.subjects.list(isParent ? childId : undefined),
    enabled: canLoadClass,
  });
  const child = (childrenQ.data ?? []).find((row) => row.id === childId);
  const profile = profileQ.data;
  const identity = {
    classroom: isParent ? child?.grade : profile?.classroom,
    grade: isParent ? undefined : profile?.grade,
    section: isParent ? undefined : profile?.section,
  };
  const teachers = teachersForClass(
    teachersQ.data ?? [],
    identity,
    [
      ...(timetableQ.data ?? []).map((block) => ({ id: block.teacherId, name: block.teacher })),
      ...(subjectsQ.data ?? []).map((subject) => ({ name: subject.teacher })),
    ],
  );
  return {
    teachers,
    teachersQ,
    classLabel: classLabels(identity)[0] ?? '',
  };
}
