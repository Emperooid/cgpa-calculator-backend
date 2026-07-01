import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        department: { include: { faculty: true } },
        semesterRecords: { orderBy: [{ level: 'asc' }, { semester: 'asc' }] },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async updateProfile(studentId: string, data: { name?: string; currentLevel?: number; targetGrade?: string; targetCgpa?: number }) {
    return this.prisma.student.update({ where: { id: studentId }, data });
  }

  async getGradeHistory(studentId: string) {
    return this.prisma.semesterRecord.findMany({
      where: { studentId },
      include: {
        gradeRecords: {
          include: { course: true },
        },
      },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }],
    });
  }
}
