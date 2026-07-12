import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { FacultiesModule } from './faculties/faculties.module';
import { DepartmentsModule } from './departments/departments.module';
import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/students.module';
import { GpaModule } from './gpa/gpa.module';
import { StudyPlansModule } from './study-plans/study-plans.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SchoolsModule,
    FacultiesModule,
    DepartmentsModule,
    CoursesModule,
    StudentsModule,
    GpaModule,
    StudyPlansModule,
  ],
})
export class AppModule {}
