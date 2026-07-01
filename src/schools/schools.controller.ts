import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';

@Controller('schools')
export class SchoolsController {
  constructor(private schools: SchoolsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.schools.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schools.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.schools.create(dto);
  }

  @Get(':id/structure')
  getStructure(
    @Param('id') schoolId: string,
    @Query('departmentId') departmentId: string,
    @Query('level') level: string,
    @Query('semester') semester: string,
  ) {
    return this.schools.getStructure(schoolId, departmentId, +level, +semester);
  }
}
