import { IsString, IsOptional } from 'class-validator';

export class CreateFacultyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsString()
  schoolId: string;
}
