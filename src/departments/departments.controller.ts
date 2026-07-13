import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('departments')
export class DepartmentsController {
  constructor(private departments: DepartmentsService) {}

  @Get()
  findByFaculty(@Query('facultyId') facultyId: string) {
    return this.departments.findByFaculty(facultyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departments.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departments.create(dto);
  }
}
