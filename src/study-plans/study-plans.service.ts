import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GpaService } from '../gpa/gpa.service';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Injectable()
export class StudyPlansService {
  constructor(
    private prisma: PrismaService,
    private gpa: GpaService,
  ) {}

  async generate(studentId: string, targetGrade: string, targetCgpa: number, semesterCourses: { code: string; title: string; units: number }[]) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const currentCgpa = await this.gpa.computeCgpa(studentId);
    const gap = targetCgpa - currentCgpa;
    const totalUnits = semesterCourses.reduce((a, c) => a + c.units, 0);

    const plan = this.buildPlan(semesterCourses, gap, totalUnits);

    const saved = await this.prisma.studyPlan.create({
      data: { studentId, targetGrade, targetCgpa, plan, isActive: true },
    });

    return { ...saved, currentCgpa };
  }

  private buildPlan(
    courses: { code: string; title: string; units: number }[],
    gap: number,
    totalUnits: number,
  ) {
    const sorted = [...courses].sort((a, b) => b.units - a.units);
    const studyHoursPerDay = gap > 1 ? 6 : gap > 0.5 ? 4 : 3;

    const weekly: Record<string, string[]> = {};
    DAYS.forEach(d => (weekly[d] = []));

    sorted.forEach((course, i) => {
      const primaryDay = DAYS[i % 5];
      const reviewDay = DAYS[(i + 2) % 5];
      weekly[primaryDay].push(`${course.code} — ${course.title} (${course.units} units)`);
      weekly[reviewDay].push(`Review ${course.code}`);
    });

    weekly['Saturday'] = ['Past Questions & Mock Tests'];
    weekly['Sunday'] = ['Rest & Light Revision'];

    const tips = [
      `Study at least ${studyHoursPerDay} hours per day to reach your target.`,
      'Prioritize high-unit courses — they impact your GPA the most.',
      'Use past questions to understand exam patterns.',
      'Form study groups for difficult courses.',
      gap > 1.0
        ? 'You need significant improvement. Cut distractions and be consistent.'
        : gap > 0
        ? 'You are close! Stay consistent and push for As in your core courses.'
        : 'Great standing! Maintain consistency to stay on track.',
    ];

    return { weekly, studyHoursPerDay, tips, totalWeeklyHours: studyHoursPerDay * 6 };
  }

  async getActive(studentId: string) {
    return this.prisma.studyPlan.findFirst({
      where: { studentId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
