import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import type { ConfirmParticipationInput, TripAction } from '@ruteam/contracts';

export class ConfirmParticipationDto implements ConfirmParticipationInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pickupId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dropoffId!: string;
}

const actions = ['START', 'FINISH', 'CANCEL'];
export class TripTransitionDto {
  @ApiProperty({ enum: actions })
  @IsIn(actions)
  action!: TripAction;
}
