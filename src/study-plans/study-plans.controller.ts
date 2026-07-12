import { Body, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { StudyPlansService } from './study-plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('study-plans')
export class StudyPlansController {
  constructor(private studyPlans: StudyPlansService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  generate(
    @CurrentUser() user: any,
    @Body()
    body: {
      targetGrade: string;
      targetCgpa: number;
      semesterCourses: { code: string; title: string; units: number }[];
    },
  ) {
    if (!user.student) throw new NotFoundException('Student profile not set up');
    return this.studyPlans.generate(user.student.id, body.targetGrade, body.targetCgpa, body.semesterCourses);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  getActive(@CurrentUser() user: any) {
    if (!user.student) throw new NotFoundException('Student profile not set up');
    return this.studyPlans.getActive(user.student.id);
  }
}
