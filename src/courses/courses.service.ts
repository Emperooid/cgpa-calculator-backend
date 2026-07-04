import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findForSemester(departmentId: string, level: number, semester: number) {
    const sem = await this.prisma.semester.findFirst({
      where: { number: semester, level: { number: level, departmentId } },
      include: {
        courses: { orderBy: { code: 'asc' } },
      },
    });
    return sem?.courses ?? [];
  }

  async create(dto: CreateCourseDto) {
    const { departmentId, level, semester, ...courseData } = dto;

    let lvl = await this.prisma.level.findUnique({
      where: { number_departmentId: { number: level, departmentId } },
    });
    if (!lvl) {
      lvl = await this.prisma.level.create({ data: { number: level, departmentId } });
    }

    let sem = await this.prisma.semester.findUnique({
      where: { number_levelId: { number: semester, levelId: lvl.id } },
    });
    if (!sem) {
      sem = await this.prisma.semester.create({ data: { number: semester, levelId: lvl.id } });
    }

    return this.prisma.course.create({
      data: { ...courseData, semesterId: sem.id, isVerified: true },
    });
  }

  async bulkCreate(departmentId: string, level: number, semester: number, courses: Omit<CreateCourseDto, 'departmentId' | 'level' | 'semester'>[]) {
    const results = await Promise.all(
      courses.map(c => this.create({ ...c, departmentId, level, semester })),
    );
    return results;
  }

  async rateCourse(courseId: string, difficulty: number, quality: number, tips?: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.courseRating.create({
      data: { courseId, difficulty, quality, tips },
    });
  }

  async getCourseStats(courseId: string) {
    const ratings = await this.prisma.courseRating.findMany({ where: { courseId } });
    if (!ratings.length) return { avgDifficulty: null, avgQuality: null, totalRatings: 0, tips: [] };
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      avgDifficulty: avg(ratings.map(r => r.difficulty)),
      avgQuality: avg(ratings.map(r => r.quality)),
      totalRatings: ratings.length,
      tips: ratings.filter(r => r.tips).map(r => r.tips),
    };
  }
}
