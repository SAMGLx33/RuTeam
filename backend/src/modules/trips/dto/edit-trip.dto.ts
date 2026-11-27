import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsString,
  Length,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PublishTripDto } from './publish-trip.dto.js';

export class EditTripDto {
  @IsInt()
  @Min(0)
  version!: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(2, 240)
  description?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PublishTripDto)
  publication?: PublishTripDto;
}
