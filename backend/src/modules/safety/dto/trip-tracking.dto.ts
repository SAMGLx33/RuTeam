import { IsISO8601, IsNumber, Max, Min, ValidateIf } from 'class-validator';
import type {
  TripDriverLocationInput,
  TripDriverLocationStopInput,
} from '@ruteam/contracts';

export class TripDriverLocationDto implements TripDriverLocationInput {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  capturedAt!: string;

  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(999999999)
  accuracyMeters?: number;
}

export class TripDriverLocationStopDto implements TripDriverLocationStopInput {
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsISO8601({ strict: true, strictSeparator: true })
  throughCapturedAt?: string;
}
