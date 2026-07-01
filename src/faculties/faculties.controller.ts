import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FacultiesService } from './faculties.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';

@Controller('faculties')
export class FacultiesController {
  constructor(private faculties: FacultiesService) {}

  @Get()
  findBySchool(@Query('schoolId') schoolId: string) {
    return this.faculties.findBySchool(schoolId);
  }

  @Post()
  create(@Body() dto: CreateFacultyDto) {
    return this.faculties.create(dto);
  }
}
