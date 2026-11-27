import { IsISO8601, IsNumber, Max, Min } from 'class-validator';
import type { TripDriverLocationInput } from '@ruteam/contracts';

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
}
