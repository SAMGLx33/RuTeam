import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsIn, IsOptional, IsUUID } from 'class-validator';
import type {
  CancellationReason,
  ConfirmParticipationInput,
  TripAction,
} from '@ruteam/contracts';

export class ConfirmParticipationDto implements ConfirmParticipationInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pickupId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dropoffId!: string;
}

const publicReasons = [
  'DRIVER_UNAVAILABLE',
  'VEHICLE_ISSUE',
  'SAFETY',
  'CHANGE_OF_PLANS',
  'OTHER',
] as const;
export class CancellationDto {
  @ApiPropertyOptional({ enum: publicReasons })
  @IsOptional()
  @IsIn(publicReasons)
  reason?: Exclude<CancellationReason, 'ACCOUNT_CLOSED'>;
}

const actions = ['START', 'FINISH', 'CANCEL', 'INTERRUPT'];
export class TripTransitionDto extends CancellationDto {
  @ApiProperty({ enum: actions })
  @IsIn(actions)
  action!: TripAction;

  @ApiPropertyOptional({ enum: [true] })
  @IsOptional()
  @Equals(true)
  confirmedSafe?: true;
  @ApiPropertyOptional({ enum: [true] })
  @IsOptional()
  @Equals(true)
  confirmMissingDropoffs?: true;
}
