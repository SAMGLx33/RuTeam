import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean, IsIn, IsOptional, Matches } from 'class-validator';
import type { NotificationPreferences } from '@ruteam/contracts';

export class NotificationSettingsDto implements NotificationPreferences {
  @ApiProperty() @IsBoolean() recommendations!: boolean;
  @ApiProperty() @IsBoolean() messages!: boolean;
  @ApiProperty() @IsBoolean() reminders!: boolean;
  @ApiProperty({ enum: [15, 30, 60], required: false })
  @IsOptional()
  @IsIn([15, 30, 60])
  reminderLeadMinutes?: 15 | 30 | 60;
  @ApiProperty() @IsBoolean() recurrences!: boolean;
  @ApiProperty() @IsBoolean() optionalTripUpdates!: boolean;
}
export class PushDeviceDto {
  @ApiProperty({ writeOnly: true })
  @Matches(/^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,128}\]$/)
  token!: string;
  @ApiProperty({ writeOnly: true })
  @Matches(/^[A-Za-z0-9_-]{32,128}$/)
  installationSecret!: string;
  @ApiProperty({ enum: ['IOS', 'ANDROID'] })
  @IsIn(['IOS', 'ANDROID'])
  platform!: 'IOS' | 'ANDROID';
  @ApiProperty({ enum: [true] }) @Equals(true) consent!: true;
}
