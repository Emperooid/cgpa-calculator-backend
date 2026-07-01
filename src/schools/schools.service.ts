import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.school.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      include: { _count: { select: { faculties: true, students: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        faculties: {
          include: {
            departments: {
              include: {
                levels: { include: { semesters: { include: { courses: true } } } },
              },
            },
          },
        },
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async create(dto: CreateSchoolDto) {
    const exists = await this.prisma.school.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('School already exists');
    return this.prisma.school.create({ data: dto });
  }

  async getStructure(schoolId: string, departmentId: string, level: number, semester: number) {
    return this.prisma.semester.findFirst({
      where: {
        number: semester,
        level: {
          number: level,
          departmentId,
        },
      },
      include: {
        courses: {
          where: { isVerified: true },
          orderBy: { code: 'asc' },
        },
      },
    });
  }
}
