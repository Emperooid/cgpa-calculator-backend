import { Module } from '@nestjs/common';
import { GpaService } from './gpa.service';
import { GpaController } from './gpa.controller';

@Module({
  providers: [GpaService],
  controllers: [GpaController],
  exports: [GpaService],
})
export class GpaModule {}
