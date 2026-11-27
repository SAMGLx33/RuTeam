import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type {
  EconomicHistoryFilter,
  EconomicHistoryRole,
} from '@ruteam/contracts';

const roles = ['PASSENGER', 'DRIVER'] as const;
const filters = [
  'FREE',
  'SUGGESTED',
  'DECLARED',
  'ACKNOWLEDGED',
  'DISPUTED',
  'CANCELLED',
] as const;
export class EconomicHistoryDto {
  @ApiPropertyOptional({ enum: roles })
  @IsOptional()
  @IsIn(roles)
  role?: EconomicHistoryRole;

  @ApiPropertyOptional({ enum: filters })
  @IsOptional()
  @IsIn(filters)
  filter?: EconomicHistoryFilter;

  @ApiPropertyOptional({ example: '2026-11' })
  @IsOptional()
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/)
  month?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number;
}
