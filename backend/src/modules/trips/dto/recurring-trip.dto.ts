import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsObject,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import type { RecurrenceInput } from '@ruteam/contracts';
import { PublishTripDto } from './publish-trip.dto.js';

const day = /^\d{4}-\d{2}-\d{2}$/;
export class RecurringTemplateDto extends OmitType(PublishTripDto, [
  'departureAt',
] as const) {}

export class RecurringTripDto implements RecurrenceInput {
  @ApiProperty()
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ format: 'date' })
  @Matches(day)
  startsOn!: string;

  @ApiProperty({ format: 'date' })
  @Matches(day)
  endsOn!: string;

  @ApiProperty({ example: '07:00' })
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  time!: string;

  @ApiProperty({ type: [Number], description: 'Lunes = 1 y domingo = 7' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn([1, 2, 3, 4, 5, 6, 7], { each: true })
  weekdays!: number[];

  @ApiProperty({ type: RecurringTemplateDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => RecurringTemplateDto)
  template!: RecurringTemplateDto;
}

export class RecurringActionDto {
  @ApiProperty({
    enum: ['PAUSE', 'RESUME', 'CANCEL', 'CANCEL_FUTURE', 'RETRY'],
  })
  @IsIn(['PAUSE', 'RESUME', 'CANCEL', 'CANCEL_FUTURE', 'RETRY'])
  action!: 'PAUSE' | 'RESUME' | 'CANCEL' | 'CANCEL_FUTURE' | 'RETRY';
}

export class DuplicateTripDto {
  @ApiProperty({ format: 'date-time' })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/,
  )
  departureAt!: string;
}
