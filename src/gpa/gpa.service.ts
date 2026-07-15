import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GRADE_POINTS_5: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
const GRADE_POINTS_4: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

const GRADE_CLASS = [
  { label: 'First Class', min: 4.5 },
  { label: 'Second Class Upper', min: 3.5 },
  { label: 'Second Class Lower', min: 2.4 },
  { label: 'Third Class', min: 1.5 },
  { label: 'Pass', min: 1.0 },
];

@Injectable()
export class GpaService {
  constructor(private prisma: PrismaService) {}

  gradePoint(grade: string, scale: 'FIVE_POINT' | 'FOUR_POINT'): number {
    const map = scale === 'FIVE_POINT' ? GRADE_POINTS_5 : GRADE_POINTS_4;
    const point = map[grade.toUpperCase()];
    if (point === undefined) throw new BadRequestException(`Invalid grade: ${grade}`);
    return point;
  }

  calculateGPA(courses: { units: number; grade: string }[], scale: 'FIVE_POINT' | 'FOUR_POINT' = 'FIVE_POINT') {
    if (!courses.length) return { gpa: 0, totalUnits: 0, qualityPoints: 0 };
    let totalUnits = 0;
    let qualityPoints = 0;
    for (const c of courses) {
      const gp = this.gradePoint(c.grade, scale);
      totalUnits += c.units;
      qualityPoints += gp * c.units;
    }
    return {
      gpa: parseFloat((qualityPoints / totalUnits).toFixed(2)),
      totalUnits,
      qualityPoints,
    };
  }

  private generatePathways(
    currentCgpa: number,
    totalUnitsDone: number,
    targetCgpa: number,
    remainingUnits: number,
    scale: 'FIVE_POINT' | 'FOUR_POINT' = 'FIVE_POINT',
  ) {
    const gradePoints = scale === 'FIVE_POINT' ? GRADE_POINTS_5 : GRADE_POINTS_4;
    const totalUnits = totalUnitsDone + remainingUnits;
    const earnedQP = currentCgpa * totalUnitsDone;

    const defs = [
      {
        name: 'Conservative',
        hint: "Mostly A grades — push hard every semester",
        mix: [{ grade: 'A', pct: 0.80 }, { grade: 'B', pct: 0.20 }],
      },
      {
        name: 'Balanced',
        hint: "A grades in heavy courses, B's in lighter ones",
        mix: [{ grade: 'A', pct: 0.60 }, { grade: 'B', pct: 0.30 }, { grade: 'C', pct: 0.10 }],
      },
      {
        name: 'Flexible',
        hint: 'Consistent B+ performance across all courses',
        mix: [{ grade: 'A', pct: 0.45 }, { grade: 'B', pct: 0.45 }, { grade: 'C', pct: 0.10 }],
      },
    ];

    return defs.map(p => {
      const avgGPA = p.mix.reduce(
        (acc, { grade, pct }) => acc + (gradePoints[grade] ?? 0) * pct,
        0,
      );
      const projectedCgpa = parseFloat(
        ((earnedQP + avgGPA * remainingUnits) / totalUnits).toFixed(2),
      );
      return {
        name: p.name,
        hint: p.hint,
        avgSemesterGPA: parseFloat(avgGPA.toFixed(2)),
        projectedCgpa,
        achievesTarget: projectedCgpa >= targetCgpa,
        gradeUnits: p.mix.map(({ grade, pct }) => ({
          grade,
          units: Math.round(pct * remainingUnits),
          pct: Math.round(pct * 100),
        })),
      };
    });
  }

  predictRequiredGPA(
    currentCgpa: number,
    totalUnitsDone: number,
    targetCgpa: number,
    remainingUnits: number,
    scale: 'FIVE_POINT' | 'FOUR_POINT' = 'FIVE_POINT',
  ) {
    const maxGP = scale === 'FIVE_POINT' ? 5 : 4;
    const totalUnits = totalUnitsDone + remainingUnits;
    const earnedQP = currentCgpa * totalUnitsDone;
    const requiredQP = targetCgpa * totalUnits;
    const neededQP = requiredQP - earnedQP;
    const requiredGPA = neededQP / remainingUnits;
    const maxAchievableCgpa = parseFloat(
      ((earnedQP + maxGP * remainingUnits) / totalUnits).toFixed(2),
    );

    const isPossible = requiredGPA <= maxGP;
    const gradeClass = GRADE_CLASS.find(g => currentCgpa >= g.min)?.label ?? 'Fail';
    const targetClass = GRADE_CLASS.find(g => targetCgpa >= g.min)?.label ?? 'Unknown';

    return {
      currentCgpa,
      targetCgpa,
      totalUnitsDone,
      remainingUnits,
      requiredGPA: isPossible ? parseFloat(requiredGPA.toFixed(2)) : null,
      maxAchievableCgpa,
      isPossible,
      currentClass: gradeClass,
      targetClass,
      message: isPossible
        ? `You need an average GPA of ${requiredGPA.toFixed(2)} over the remaining ${remainingUnits} units.`
        : `Even with all A's, the maximum CGPA you can achieve is ${maxAchievableCgpa}. Your target of ${targetCgpa} is not achievable.`,
      pathways: this.generatePathways(currentCgpa, totalUnitsDone, targetCgpa, remainingUnits, scale),
    };
  }

  async submitSemesterGrades(
    studentId: string,
    level: number,
    semester: number,
    year: number,
    grades: { courseId: string; grade: string }[],
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const scale = student.school.gradingScale as 'FIVE_POINT' | 'FOUR_POINT';

    const courses = await Promise.all(
      grades.map(g => this.prisma.course.findUnique({ where: { id: g.courseId } })),
    );

    const coursesWithGrades = grades.map((g, i) => ({
      units: courses[i]!.units,
      grade: g.grade,
      courseId: g.courseId,
      gradePoint: this.gradePoint(g.grade, scale),
    }));

    const { gpa, totalUnits } = this.calculateGPA(coursesWithGrades, scale);

    const semRecord = await this.prisma.semesterRecord.upsert({
      where: { studentId_level_semester_year: { studentId, level, semester, year } },
      update: { gpa, totalUnits },
      create: { studentId, level, semester, year, gpa, totalUnits },
    });

    await Promise.all(
      coursesWithGrades.map(c =>
        this.prisma.gradeRecord.upsert({
          where: { studentId_courseId: { studentId, courseId: c.courseId } },
          update: { grade: c.grade, gradePoint: c.gradePoint, semesterRecordId: semRecord.id },
          create: {
            studentId,
            courseId: c.courseId,
            grade: c.grade,
            gradePoint: c.gradePoint,
            semesterRecordId: semRecord.id,
          },
        }),
      ),
    );

    const cgpa = await this.computeCgpa(studentId);
    await this.prisma.student.update({
      where: { id: studentId },
      data: { currentLevel: level },
    });

    return { gpa, cgpa, totalUnits, semesterRecordId: semRecord.id };
  }

  async computeCgpa(studentId: string) {
    const records = await this.prisma.semesterRecord.findMany({ where: { studentId } });
    if (!records.length) return 0;
    const totalQP = records.reduce((acc, r) => acc + r.gpa * r.totalUnits, 0);
    const totalUnits = records.reduce((acc, r) => acc + r.totalUnits, 0);
    return parseFloat((totalQP / totalUnits).toFixed(2));
  }

  async getStudentAnalytics(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        semesterRecords: { orderBy: [{ level: 'asc' }, { semester: 'asc' }] },
        gradeRecords: { include: { course: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const cgpa = await this.computeCgpa(studentId);
    const semesterTrend = student.semesterRecords.map(r => ({
      label: `${r.level}L S${r.semester}`,
      gpa: r.gpa,
      totalUnits: r.totalUnits,
    }));

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    student.gradeRecords.forEach(r => {
      const g = r.grade.toUpperCase() as keyof typeof gradeDistribution;
      if (g in gradeDistribution) gradeDistribution[g]++;
    });

    const sortedByGP = [...student.gradeRecords].sort((a, b) => b.gradePoint - a.gradePoint);
    const currentClass = GRADE_CLASS.find(g => cgpa >= g.min)?.label ?? 'Fail';

    // Estimate remaining units (assume 180-unit degree; at least 30 remaining to avoid div-by-zero)
    const totalUnitsDone = student.semesterRecords.reduce((a, r) => a + r.totalUnits, 0);
    const totalProgramUnits = Math.max(totalUnitsDone + 30, 180);
    const remainingEst = totalProgramUnits - totalUnitsDone;

    const chances = GRADE_CLASS.map(g => {
      const reqGPA = (g.min * totalProgramUnits - cgpa * totalUnitsDone) / remainingEst;
      const maxGP = 5;
      let probability: number;
      if (cgpa >= g.min) {
        probability = 100;
      } else if (reqGPA > maxGP) {
        probability = 0;
      } else {
        // reqGPA=3.5 → ~90%, reqGPA=5.0 → ~8%
        const normalized = Math.max(0, (maxGP - reqGPA) / (maxGP - 3.5));
        probability = Math.min(92, Math.max(8, Math.round(normalized * 84 + 8)));
      }
      return {
        class: g.label,
        possible: reqGPA <= maxGP,
        probability,
        requiredGPA: parseFloat(Math.max(0, reqGPA).toFixed(2)),
      };
    });

    return {
      cgpa,
      currentClass,
      semesterTrend,
      gradeDistribution,
      strongestCourse: sortedByGP[0]?.course.title ?? null,
      weakestCourse: sortedByGP[sortedByGP.length - 1]?.course.title ?? null,
      totalUnitsCompleted: student.semesterRecords.reduce((a, r) => a + r.totalUnits, 0),
      chances,
    };
  }

  async deleteSemesterRecord(studentId: string, semesterRecordId: string) {
    const record = await this.prisma.semesterRecord.findUnique({ where: { id: semesterRecordId } });
    if (!record || record.studentId !== studentId) throw new NotFoundException('Semester record not found');
    await this.prisma.gradeRecord.deleteMany({ where: { semesterRecordId } });
    await this.prisma.semesterRecord.delete({ where: { id: semesterRecordId } });
    const newCgpa = await this.computeCgpa(studentId);
    return { deleted: true, newCgpa };
  }

  async getPrediction(studentId: string, targetCgpa: number, totalProgramUnits: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const scale = student.school.gradingScale as 'FIVE_POINT' | 'FOUR_POINT';
    const currentCgpa = await this.computeCgpa(studentId);
    const totalUnitsDone = (
      await this.prisma.semesterRecord.findMany({ where: { studentId } })
    ).reduce((a, r) => a + r.totalUnits, 0);

    const remainingUnits = totalProgramUnits - totalUnitsDone;
    if (remainingUnits <= 0) throw new BadRequestException('No remaining units');

    return this.predictRequiredGPA(currentCgpa, totalUnitsDone, targetCgpa, remainingUnits, scale);
  }
}
