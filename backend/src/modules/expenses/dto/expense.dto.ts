import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type {
  CompensationAction,
  CompensationMethod,
  TripEconomicsInput,
  TripExpenseInput,
} from '@ruteam/contracts';
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

export const compensationMethods = ['NEQUI', 'DAVIPLATA', 'CASH'] as const;

export class TripEconomicsDto implements TripEconomicsInput {
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => TripExpenseDto)
  estimate?: TripExpenseDto;

  @IsArray()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(compensationMethods, { each: true })
  compensationMethods!: CompensationMethod[];
}

export class TripEconomicsPreviewDto {
  @IsInt()
  @Min(1)
  @Max(4)
  offeredSeats!: number;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => TripEconomicsDto)
  economics!: TripEconomicsDto;
}

export class DeclareCompensationDto {
  @IsIn(compensationMethods)
  method!: CompensationMethod;
}

export class ResolveCompensationDto {
  @IsIn(['ACKNOWLEDGE', 'DISPUTE', 'CANCEL'])
  action!: CompensationAction;
}
