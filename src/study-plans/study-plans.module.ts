import { Module } from '@nestjs/common';
import { StudyPlansService } from './study-plans.service';
import { StudyPlansController } from './study-plans.controller';
import { GpaModule } from '../gpa/gpa.module';

@Module({
  imports: [GpaModule],
  providers: [StudyPlansService],
  controllers: [StudyPlansController],
})
export class StudyPlansModule {}
