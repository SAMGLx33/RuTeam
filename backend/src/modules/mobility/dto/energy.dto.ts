import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsObject,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AlternativeMode,
  ConsumptionUnit,
  EnergySource,
  PropulsionType,
} from '@ruteam/contracts';

const energySources: EnergySource[] = [
  'GASOLINE',
  'GASOLINE_E10',
  'DIESEL',
  'COLOMBIAN_GRID',
  'OTHER',
];
const propulsionTypes: PropulsionType[] = [
  'COMBUSTION',
  'HYBRID',
  'ELECTRIC',
  'OTHER',
];
const consumptionUnits: ConsumptionUnit[] = [
  'KM_PER_L',
  'L_PER_100_KM',
  'KWH_PER_100_KM',
];
const alternativeModes: AlternativeMode[] = [
  'UNSPECIFIED',
  'CAR',
  'MOTORCYCLE',
  'PUBLIC_TRANSIT',
  'CYCLE',
  'WALK',
  'OTHER',
];

export class VehicleEnergyDto {
  @ApiProperty({ enum: propulsionTypes })
  @IsIn(propulsionTypes)
  propulsion!: PropulsionType;

  @ApiProperty({ enum: energySources })
  @IsIn(energySources)
  source!: EnergySource;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  average?: number;

  @ApiPropertyOptional({ enum: consumptionUnits })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(consumptionUnits)
  unit?: ConsumptionUnit;
}

export class VehicleEnergyUpdateDto {
  @ApiProperty({ type: VehicleEnergyDto, nullable: true })
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  @ValidateNested()
  @Type(() => VehicleEnergyDto)
  profile!: VehicleEnergyDto | null;
}
export class AlternativeMobilityDto {
  @ApiProperty({ enum: alternativeModes })
  @IsIn(alternativeModes)
  mode!: AlternativeMode;

  @ApiPropertyOptional({ type: VehicleEnergyDto })
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => VehicleEnergyDto)
  energy?: VehicleEnergyDto;
}
