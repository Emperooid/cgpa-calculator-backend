import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('students')
export class StudentsController {
  constructor(private students: StudentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  createProfile(
    @CurrentUser() user: any,
    @Body() body: { name: string; schoolId: string; departmentId: string; currentLevel: number; matricYear?: number },
  ) {
    return this.students.createProfile(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.students.getProfile(user.student.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body() body: { name?: string; currentLevel?: number; targetGrade?: string; targetCgpa?: number },
  ) {
    return this.students.updateProfile(user.student.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getHistory(@CurrentUser() user: any) {
    return this.students.getGradeHistory(user.student.id);
  }
}
