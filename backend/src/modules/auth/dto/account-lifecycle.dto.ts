import {
  Equals,
  IsEmail,
  IsIn,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecentPasswordDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @Length(1, 128)
  password!: string;
}

export class CloseAccountDto extends RecentPasswordDto {
  @ApiProperty({ enum: ['DEACTIVATE', 'REQUEST_DELETION'] })
  @IsIn(['DEACTIVATE', 'REQUEST_DELETION'])
  action!: 'DEACTIVATE' | 'REQUEST_DELETION';

  @ApiProperty({ enum: [true] })
  @Equals(true)
  confirmed!: true;
}

export class AccountRecoveryStatusDto extends RecentPasswordDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class AccountRecoveryActionDto extends AccountRecoveryStatusDto {
  @ApiProperty({ enum: ['REACTIVATE', 'WITHDRAW_DELETION'] })
  @IsIn(['REACTIVATE', 'WITHDRAW_DELETION'])
  action!: 'REACTIVATE' | 'WITHDRAW_DELETION';

  @ApiProperty({ enum: [true] })
  @Equals(true)
  confirmed!: true;
}
