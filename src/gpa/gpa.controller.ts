import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GpaService } from './gpa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('gpa')
export class GpaController {
  constructor(private gpa: GpaService) {}

  @Post('calculate')
  calculateGPA(
    @Body() body: { courses: { units: number; grade: string }[]; scale?: 'FIVE_POINT' | 'FOUR_POINT' },
  ) {
    return this.gpa.calculateGPA(body.courses, body.scale ?? 'FIVE_POINT');
  }

  @UseGuards(JwtAuthGuard)
  @Post('submit-semester')
  submitSemesterGrades(
    @CurrentUser() user: any,
    @Body()
    body: {
      level: number;
      semester: number;
      year: number;
      grades: { courseId: string; grade: string }[];
    },
  ) {
    if (!user.student) throw new NotFoundException('Student profile not set up');
    return this.gpa.submitSemesterGrades(
      user.student.id,
      body.level,
      body.semester,
      body.year,
      body.grades,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('analytics')
  getAnalytics(@CurrentUser() user: any) {
    if (!user.student) {
      return {
        cgpa: 0,
        currentClass: 'N/A',
        semesterTrend: [],
        gradeDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
        strongestCourse: null,
        weakestCourse: null,
        totalUnitsCompleted: 0,
        chances: [],
      };
    }
    return this.gpa.getStudentAnalytics(user.student.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('predict')
  predict(
    @CurrentUser() user: any,
    @Query('targetCgpa') targetCgpa: string,
    @Query('totalProgramUnits') totalProgramUnits: string,
  ) {
    if (!user.student) throw new NotFoundException('Student profile not set up');
    return this.gpa.getPrediction(user.student.id, +targetCgpa, +totalProgramUnits);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('semester/:id')
  deleteSemester(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user.student) throw new NotFoundException('Student profile not set up');
    return this.gpa.deleteSemesterRecord(user.student.id, id);
  }

  @Post('predict/quick')
  quickPredict(
    @Body()
    body: {
      currentCgpa: number;
      totalUnitsDone: number;
      targetCgpa: number;
      remainingUnits: number;
      scale?: 'FIVE_POINT' | 'FOUR_POINT';
    },
  ) {
    return this.gpa.predictRequiredGPA(
      body.currentCgpa,
      body.totalUnitsDone,
      body.targetCgpa,
      body.remainingUnits,
      body.scale ?? 'FIVE_POINT',
    );
  }
}
