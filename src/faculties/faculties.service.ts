import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';

@Injectable()
export class FacultiesService {
  constructor(private prisma: PrismaService) {}

  async findBySchool(schoolId: string) {
    return this.prisma.faculty.findMany({
      where: { schoolId },
      include: { _count: { select: { departments: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateFacultyDto) {
    const school = await this.prisma.school.findUnique({ where: { id: dto.schoolId } });
    if (!school) throw new NotFoundException('School not found');
    return this.prisma.faculty.create({ data: dto });
  }
}
