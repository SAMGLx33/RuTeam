import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { TripExpenseInput } from '@ruteam/contracts';
import { maxExpensePerConcept } from '../domain/expense-policy.js';

const pesos = {
  type: 'integer',
  minimum: 0,
  maximum: maxExpensePerConcept,
} as const;
export class TripExpenseDto implements TripExpenseInput {
  @ApiProperty(pesos)
  @IsInt()
  @Min(0)
  @Max(maxExpensePerConcept)
  fuelCop!: number;

  @ApiProperty(pesos)
  @IsInt()
  @Min(0)
  @Max(maxExpensePerConcept)
  tollsCop!: number;

  @ApiProperty(pesos)
  @IsInt()
  @Min(0)
  @Max(maxExpensePerConcept)
  parkingCop!: number;
}
