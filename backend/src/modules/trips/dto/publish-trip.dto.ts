import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItineraryDto } from './itinerary.dto.js';
export class GeoPointDto {
  @ApiProperty() @IsString() @Length(2, 100) label!: string;
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude!: number;
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude!: number;
}
export class TripStopDto extends GeoPointDto {
  @ApiProperty() @IsInt() @Min(1) @Max(10) position!: number;
}
export class PublishTripDto {
  @ApiProperty() @IsUUID() vehicleId!: string;
  @ApiPropertyOptional()
  @ValidateIf(
    (dto: PublishTripDto, value) => !dto.itinerary || value !== undefined,
  )
  @IsUUID()
  destinationId?: string;
  @ApiPropertyOptional({ type: GeoPointDto })
  @ValidateIf(
    (dto: PublishTripDto, value) => !dto.itinerary || value !== undefined,
  )
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => GeoPointDto)
  origin?: GeoPointDto;
  @ApiProperty({ format: 'date-time' })
  @IsDateString({ strict: true })
  departureAt!: string;
  @ApiProperty({
    description: 'Duración DEMO declarada para solapamientos, no ETA real',
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
  @ApiPropertyOptional({ type: [TripStopDto] })
  @ValidateIf(
    (dto: PublishTripDto, value) => !dto.itinerary || value !== undefined,
  )
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TripStopDto)
  stops?: TripStopDto[];
  @ApiPropertyOptional({ type: ItineraryDto })
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ItineraryDto)
  itinerary?: ItineraryDto;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  providesHelmet?: boolean;
}
