import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { SubmitRatingInput } from '@ruteam/contracts';

export class SubmitRatingDto implements SubmitRatingInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  rateeId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, type: 'integer' })
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RatingsPageDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
