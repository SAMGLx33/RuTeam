import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsObject,
  ValidateNested,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleEnergyDto } from '../../mobility/dto/energy.dto.js';
import { VEHICLE_COLORS } from '../domain/policies/vehiculo.policy.js';
export class RegisterVehicleDto {
  @ApiProperty({ example: 'DEM123' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(6, 6)
  plate!: string;
  @ApiProperty({ enum: ['CAR', 'MOTORCYCLE'] })
  @IsIn(['CAR', 'MOTORCYCLE'])
  type!: 'CAR' | 'MOTORCYCLE';
  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  passengerCapacity!: number;
  @ApiProperty() @IsString() @Length(2, 60) brand!: string;
  @ApiProperty({ minimum: 1991 })
  @IsInt()
  @Min(1991)
  @Max(new Date().getUTCFullYear() + 1)
  modelYear!: number;
  @ApiProperty({ enum: VEHICLE_COLORS }) @IsIn(VEHICLE_COLORS) color!: string;
  @ApiProperty({ format: 'date-time' })
  @IsDateString({ strict: true })
  soatExpiresAt!: string;

  @ApiPropertyOptional({ type: VehicleEnergyDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VehicleEnergyDto)
  energyProfile?: VehicleEnergyDto;
}
export class RegisterLicenseDto {
  @ApiProperty({ enum: ['CAR', 'MOTORCYCLE', 'BOTH'] })
  @IsIn(['CAR', 'MOTORCYCLE', 'BOTH'])
  category!: 'CAR' | 'MOTORCYCLE' | 'BOTH';
  @ApiProperty({ format: 'date-time' })
  @IsDateString({ strict: true })
  expiresAt!: string;
}
export class UpdateSoatDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString({ strict: true })
  soatExpiresAt!: string;
}
