import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RequestTripDto {
  @IsString()
  pickupAddress: string;

  @IsNumber()
  @Min(-90) @Max(90)
  pickupLat: number;

  @IsNumber()
  @Min(-180) @Max(180)
  pickupLng: number;

  @IsString()
  dropoffAddress: string;

  @IsNumber()
  @Min(-90) @Max(90)
  dropoffLat: number;

  @IsNumber()
  @Min(-180) @Max(180)
  dropoffLng: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class EstimateFareDto {
  @IsNumber() @Min(-90) @Max(90)  pickupLat: number;
  @IsNumber() @Min(-180) @Max(180) pickupLng: number;
  @IsNumber() @Min(-90) @Max(90)  dropoffLat: number;
  @IsNumber() @Min(-180) @Max(180) dropoffLng: number;
}
