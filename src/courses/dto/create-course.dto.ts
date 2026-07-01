import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  code: string;

  @IsString()
  title: string;

  @IsInt()
  @Min(1)
  @Max(6)
  units: number;

  @IsOptional()
  @IsBoolean()
  isCompulsory?: boolean;

  @IsString()
  departmentId: string;

  @IsInt()
  level: number;

  @IsInt()
  @Min(1)
  @Max(2)
  semester: number;
}
