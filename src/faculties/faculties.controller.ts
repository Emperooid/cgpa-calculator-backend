import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FacultiesService } from './faculties.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('faculties')
export class FacultiesController {
  constructor(private faculties: FacultiesService) {}

  @Get()
  findBySchool(@Query('schoolId') schoolId: string) {
    return this.faculties.findBySchool(schoolId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateFacultyDto) {
    return this.faculties.create(dto);
  }
}
