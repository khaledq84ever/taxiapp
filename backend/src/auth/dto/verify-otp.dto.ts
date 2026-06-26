import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;

  role?: 'PASSENGER' | 'DRIVER';
}
