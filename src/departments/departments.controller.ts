import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

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

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departments.create(dto);
  }
}
