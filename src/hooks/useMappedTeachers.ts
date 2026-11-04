import { useQuery } from '@tanstack/react-query';
import { classLabels, teachersForClass } from '@/lib/classTeachers';
import { services } from '@/services';
import { useAuth } from '@/providers/AuthProvider';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useChildren } from './useParent';
import { useDirectory } from './useDirectory';
import { qk } from './keys';

/** A subject title copied into the teacher field is not a person's name. */
function teacherName(name?: string, subject?: string): string {
  const teacher = (name ?? '').trim();
  const title = (subject ?? '').trim();
  if (!teacher) return '';
  if (title && teacher.toLowerCase() === title.toLowerCase()) return '';
  return teacher;
}

/** This class's teachers. A person who also leads the school keeps that role. */
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
  const slots = [
    ...(timetableQ.data ?? [])
      .filter((block) => block.kind !== 'break')
      .map((block) => ({
        id: block.teacherId,
        name: teacherName(block.teacher, block.label),
        subject: block.label,
      })),
    ...(subjectsQ.data ?? []).map((subject) => ({
      name: teacherName(subject.teacher, subject.name),
      subject: subject.name,
    })),
  ];
  const teachers = teachersForClass(teachersQ.data ?? [], identity, slots);
  return {
    teachers,
    teachersQ,
    identity,
    classLabel: classLabels(identity)[0] ?? '',
  };
}
