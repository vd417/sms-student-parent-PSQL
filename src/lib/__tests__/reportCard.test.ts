import { buildReportFromGrades } from '../reportCardBuild';
import { gradeFor, gpaFor } from '../gradeScale';
import { reportCardPrintHtml, reportCardPdfTitle } from '../reportCardPrint';
import type { Grade, Subject } from '@/models';

describe('gradeScale', () => {
  it('matches CBSE bands used by admin CRM', () => {
    expect(gradeFor(95)).toBe('A1');
    expect(gradeFor(85)).toBe('A2');
    expect(gradeFor(45)).toBe('C2');
    expect(gradeFor(40)).toBe('D');
    expect(gradeFor(33)).toBe('D');
    expect(gradeFor(20)).toBe('E');
    expect(gpaFor('A1')).toBe(10);
    expect(gpaFor('E')).toBe(3);
  });
});

describe('buildReportFromGrades', () => {
  const subjects: Subject[] = [
    {
      id: 's1',
      name: 'Mathematics',
      short: 'MA',
      teacher: 'T',
      avg: 0,
      trend: 0,
      color: 'blue',
    },
    {
      id: 's2',
      name: 'Science',
      short: 'SC',
      teacher: 'T',
      avg: 0,
      trend: 0,
      color: 'green',
    },
  ];

  it('sums multiple papers per subject and computes totals', () => {
    const grades: Grade[] = [
      {
        id: '1',
        subjId: 's1',
        title: 'UT1',
        score: 40,
        max: 50,
        grade: '',
        date: '',
      },
      {
        id: '2',
        subjId: 's1',
        title: 'UT2',
        score: 35,
        max: 50,
        grade: '',
        date: '',
      },
      {
        id: '3',
        subjId: 's2',
        title: 'UT1',
        score: 45,
        max: 100,
        grade: '',
        date: '',
      },
    ];
    const report = buildReportFromGrades(grades, subjects);
    expect(report.rows).toHaveLength(2);
    const math = report.rows.find((r) => r.subject === 'Mathematics')!;
    expect(math.marks).toBe(75);
    expect(math.max).toBe(100);
    expect(math.pass).toBe(true);
    expect(report.total).toBe(120);
    expect(report.maxTotal).toBe(200);
    expect(report.result).toBe('PASS');
  });

  it('marks compartment when any subject fails', () => {
    const grades: Grade[] = [
      {
        id: '1',
        subjId: 's1',
        title: 'UT1',
        score: 10,
        max: 100,
        grade: '',
        date: '',
      },
    ];
    const report = buildReportFromGrades(grades, subjects);
    expect(report.result).toBe('COMPARTMENT');
    expect(report.rows[0].pass).toBe(false);
  });

  it('stays blank when every grade references a subject outside the class catalog', () => {
    // Regression: a real tenant had exam papers recorded against subjects (Arts, Biology, ...)
    // that were never added to the class's own subject/timetable catalog. The report must
    // stay blank rather than surface those grades as if they belonged to this class.
    const grades: Grade[] = [
      { id: '1', subjId: 'arts', subjectName: 'Arts', title: 'UT1', score: 85, max: 100, grade: '', date: '' },
      { id: '2', subjId: 'bio', subjectName: 'Biology', title: 'UT1', score: 90, max: 100, grade: '', date: '' },
    ];
    const report = buildReportFromGrades(grades, subjects);
    expect(report.rows).toEqual([]);
    expect(report.pct).toBe(0);
    expect(report.grade).toBe('—');
    expect(report.gpa).toBe(0);
  });

  it('omits subjects that are not in the class catalog (IV-B vs IV-A)', () => {
    const grades: Grade[] = [
      {
        id: '1',
        subjId: 's1',
        subjectName: 'Mathematics',
        title: 'UT1',
        score: 80,
        max: 100,
        grade: '',
        date: '',
      },
      {
        id: '2',
        subjId: 'french',
        subjectName: 'French',
        title: 'UT1',
        score: 90,
        max: 100,
        grade: '',
        date: '',
      },
    ];
    const report = buildReportFromGrades(grades, subjects);
    expect(report.rows.map((r) => r.subject)).toEqual(['Mathematics']);
    expect(report.total).toBe(80);
  });
});

describe('reportCardPrintHtml', () => {
  it('renders school name, subjects, and PASS badge like CRM', () => {
    const html = reportCardPrintHtml({
      schoolName: 'demo school',
      schoolBrandColor: '#0C4A6E',
      schoolLogoUrl: 'https://cdn.example/logo.png',
      examName: 'Exam marks',
      student: {
        name: 'ada lovelace',
        adm: 'ADM/01',
        cls: 'IV-A',
        roll: 7,
        guardian: '',
        attendance: 96,
      },
      report: {
        rows: [
          {
            subject: 'Mathematics',
            marks: 80,
            max: 100,
            grade: 'A2',
            gpa: 9,
            pass: true,
          },
        ],
        total: 80,
        maxTotal: 100,
        pct: 80,
        grade: 'A2',
        gpa: 9,
        result: 'PASS',
      },
      rank: 2,
      classSize: 40,
    });
    expect(html).toContain('Demo School');
    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('Mathematics');
    expect(html).toContain('PASS');
    expect(html).toContain('Class rank');
    expect(html).toContain('rc-watermark');
    expect(html).toContain('https://cdn.example/logo.png');
    expect(reportCardPdfTitle({
      student: { name: 'ada', adm: 'A/1', cls: 'IV', roll: 1, guardian: '', attendance: 0 },
      examName: 'Exam marks',
    })).toContain('Exam Marks');
  });
});
