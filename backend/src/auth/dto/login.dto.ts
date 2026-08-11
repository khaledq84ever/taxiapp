import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be in E.164 format e.g. +966501234567' })
  phone: string;

  @IsOptional()
  @IsString()
  @IsIn(['PASSENGER', 'DRIVER'])
  role?: 'PASSENGER' | 'DRIVER';
}
