import { IsString, IsOptional, IsEnum } from 'class-validator';
import { GradingScale } from '@prisma/client';

export class CreateSchoolDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(GradingScale)
  gradingScale?: GradingScale;
}
