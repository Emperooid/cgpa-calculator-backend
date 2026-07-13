import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class BulkCourseItem {
  @IsString() code: string;
  @IsString() title: string;
  @IsInt() @Min(1) @Max(6) @Type(() => Number) units: number;
  @IsOptional() @IsBoolean() isCompulsory?: boolean;
}

class BulkCreateBody {
  @IsString() departmentId: string;
  @IsInt() @Type(() => Number) level: number;
  @IsInt() @Min(1) @Max(2) @Type(() => Number) semester: number;
  courses: BulkCourseItem[];
}

@Controller('courses')
export class CoursesController {
  constructor(private courses: CoursesService) {}

  @Get()
  findForSemester(
    @Query('departmentId') departmentId: string,
    @Query('level') level: string,
    @Query('semester') semester: string,
  ) {
    return this.courses.findForSemester(departmentId, +level, +semester);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  bulkCreate(@Body() body: BulkCreateBody) {
    return this.courses.bulkCreate(body.departmentId, body.level, body.semester, body.courses);
  }

  @Get(':id/stats')
  getCourseStats(@Param('id') id: string) {
    return this.courses.getCourseStats(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rate')
  rateCourse(
    @Param('id') id: string,
    @Body() body: { difficulty: number; quality: number; tips?: string },
  ) {
    return this.courses.rateCourse(id, body.difficulty, body.quality, body.tips);
  }
}
