import { IsEmail, IsString, MinLength, IsOptional, IsInt, Min, Max } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  schoolId: string;

  @IsString()
  departmentId: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  matricYear?: number;

  @IsOptional()
  @IsInt()
  currentLevel?: number;
}
