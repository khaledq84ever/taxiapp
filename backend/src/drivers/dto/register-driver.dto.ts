import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class RegisterDriverDto {
  @IsString()
  licenseNumber: string;

  @IsString()
  carMake: string;

  @IsString()
  carModel: string;

  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  carYear: number;

  @IsString()
  carColor: string;

  @IsString()
  carPlate: string;

  @IsOptional()
  @IsString()
  licensePhoto?: string;

  @IsOptional()
  @IsString()
  carPhoto?: string;
}
