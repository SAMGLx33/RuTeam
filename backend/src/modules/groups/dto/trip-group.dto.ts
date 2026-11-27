import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Matches, Max, Min } from 'class-validator';
import type { CreateTripGroupInput } from '@ruteam/contracts';

export class CreateTripGroupDto implements CreateTripGroupInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pickupId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  dropoffId!: string;

  @ApiProperty({ minimum: 2, maximum: 4 })
  @IsInt()
  @Min(2)
  @Max(4)
  expectedMembers!: number;
}

export class TripGroupInvitationDto {
  @ApiProperty({ minLength: 43, maxLength: 43 })
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  code!: string;
}
