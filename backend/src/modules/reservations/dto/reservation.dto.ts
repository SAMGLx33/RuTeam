import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsUUID,
} from 'class-validator';
import type {
  RequestReservationInput,
  ReservationDecision,
  TripAction,
} from '@ruteam/contracts';

export class RequestReservationDto implements RequestReservationInput {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 4, uniqueItems: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  memberIds!: string[];

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pickupId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dropoffId!: string;
}

const decisions = ['ACCEPT', 'REJECT'];
export class ReservationDecisionDto {
  @ApiProperty({ enum: decisions })
  @IsIn(decisions)
  decision!: ReservationDecision;
}

const actions = ['START', 'FINISH', 'CANCEL'];
export class TripTransitionDto {
  @ApiProperty({ enum: actions })
  @IsIn(actions)
  action!: TripAction;
}
