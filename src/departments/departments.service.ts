import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findByFaculty(facultyId: string) {
    return this.prisma.department.findMany({
      where: { facultyId },
      include: { _count: { select: { levels: true, students: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        faculty: { include: { school: true } },
        levels: {
          include: { semesters: { include: { courses: true } } },
          orderBy: { number: 'asc' },
        },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    const faculty = await this.prisma.faculty.findUnique({ where: { id: dto.facultyId } });
    if (!faculty) throw new NotFoundException('Faculty not found');
    return this.prisma.department.create({ data: dto });
  }
}
