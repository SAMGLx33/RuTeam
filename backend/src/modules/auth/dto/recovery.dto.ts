import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length, Matches } from 'class-validator';
import type { RecoveryChannel } from '@ruteam/contracts';

export class RecoveryContactDto {
  @ApiProperty({ enum: ['EMAIL', 'PHONE'] })
  @IsIn(['EMAIL', 'PHONE'])
  channel!: RecoveryChannel;

  @ApiProperty()
  @IsString()
  @Length(1, 254)
  contact!: string;
}

export class ConfigureRecoveryDto extends RecoveryContactDto {
  @ApiProperty() @IsString() @Length(12, 128) password!: string;
}

export class RecoveryCodeDto {
  @ApiProperty({ pattern: '^[0-9]{6}$' })
  @IsString()
  @Matches(/^[0-9]{6}$/)
  code!: string;
}
