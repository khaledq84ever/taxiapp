import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export enum RideType {
  ECONOMY  = 'ECONOMY',
  COMFORT  = 'COMFORT',
  PREMIUM  = 'PREMIUM',
}

export const RIDE_TYPE_MULTIPLIER: Record<RideType, number> = {
  ECONOMY: 1.0,
  COMFORT: 1.35,
  PREMIUM: 1.7,
};

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

  @IsOptional()
  @IsEnum(RideType)
  rideType?: RideType;

  @IsOptional()
  @IsNumber()
  surgeMultiplier?: number;
}

export class EstimateFareDto {
  @IsNumber() @Min(-90) @Max(90)  pickupLat: number;
  @IsNumber() @Min(-180) @Max(180) pickupLng: number;
  @IsNumber() @Min(-90) @Max(90)  dropoffLat: number;
  @IsNumber() @Min(-180) @Max(180) dropoffLng: number;

  @IsOptional()
  @IsEnum(RideType)
  rideType?: RideType;
}
