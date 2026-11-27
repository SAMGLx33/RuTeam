import { IsISO8601, Matches } from 'class-validator';

export class DelayTripDto {
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/)
  estimatedDepartureAt!: string;
}
