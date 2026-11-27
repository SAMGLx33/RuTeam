import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripEconomicsDto } from '../../expenses/dto/expense.dto.js';
import { ItineraryDto } from './itinerary.dto.js';
export class PublishTripDto {
  @ApiProperty() @IsUUID() vehicleId!: string;
  @ApiProperty({ format: 'date-time' })
  @IsDateString({ strict: true })
  departureAt!: string;
  @ApiProperty({
    description: 'Duración estimada para validar el intervalo del viaje',
    minimum: 5,
    maximum: 360,
  })
  @IsInt()
  @Min(5)
  @Max(360)
  estimatedDurationMinutes!: number;
  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  offeredSeats!: number;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  ruleIds!: string[];
  @ApiProperty({ type: ItineraryDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ItineraryDto)
  itinerary!: ItineraryDto;
  @ApiPropertyOptional({ type: TripEconomicsDto })
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => TripEconomicsDto)
  economics?: TripEconomicsDto;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  providesHelmet?: boolean;
}
