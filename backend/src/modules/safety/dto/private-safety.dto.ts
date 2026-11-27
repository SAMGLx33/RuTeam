import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import type {
  EmergencyContactInput,
  TripIncidentInput,
  TripIncidentKind,
} from '@ruteam/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EmergencyContactDto implements EmergencyContactInput {
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  name!: string;

  @Transform(trim)
  @Matches(/^\+?[0-9]{7,15}$/)
  phone!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 40)
  relationship?: string | null;

  @IsBoolean()
  available!: boolean;
}

export class TripIncidentDto implements TripIncidentInput {
  @IsIn([
    'ROAD_SAFETY',
    'TRIP_PROBLEM',
    'CONDUCT',
    'TERMS',
    'VEHICLE',
    'ECONOMIC',
    'TECHNICAL',
    'OTHER',
  ])
  kind!: TripIncidentKind;

  @Transform(trim)
  @IsString()
  @Length(5, 1000)
  description!: string;
}

export class PrivateHistoryQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset = 0;
}
