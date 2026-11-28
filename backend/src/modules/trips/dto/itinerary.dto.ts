import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsObject,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import type {
  RouteGeometry,
  RouteManeuver,
  StopAccess,
  TripDirection,
} from '@ruteam/contracts';

export class MeetingPointDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  campusPointId?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(2, 100)
  label?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ enum: ['USC'] })
  @ValidateIf((_, value) => value !== undefined)
  @Equals('USC')
  campusReference?: 'USC';

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 240)
  instructions?: string;
}

const stopAccess = ['PICKUP', 'DROPOFF', 'BOTH', 'WAYPOINT'];
export class ItineraryStopDto extends MeetingPointDto {
  @ApiProperty({ enum: stopAccess })
  @IsIn(stopAccess)
  access!: StopAccess;
}

export class RouteGeometryDto implements RouteGeometry {
  @ApiProperty({ enum: ['LineString'] })
  @Equals('LineString')
  type!: 'LineString';

  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' },
      minItems: 2,
      maxItems: 2,
    },
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(500)
  coordinates!: RouteGeometry['coordinates'];
}

export class ItineraryDto {
  @ApiPropertyOptional({ enum: ['DESDE_USC', 'HACIA_USC'] })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['DESDE_USC', 'HACIA_USC'])
  direction?: TripDirection;

  @ApiProperty({ type: MeetingPointDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MeetingPointDto)
  origin!: MeetingPointDto;

  @ApiProperty({ type: MeetingPointDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MeetingPointDto)
  destination!: MeetingPointDto;

  @ApiProperty({ type: [ItineraryStopDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ItineraryStopDto)
  stops!: ItineraryStopDto[];

  @ApiProperty()
  @IsString()
  @Length(2, 240)
  description!: string;

  @ApiPropertyOptional({ type: RouteGeometryDto })
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => RouteGeometryDto)
  geometry?: RouteGeometryDto;

  @ApiPropertyOptional({ description: 'Selección vial firmada por RuTeam' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(10, 524)
  routingSelection?: string;

  @ApiPropertyOptional({
    description: 'Indicaciones devueltas por OSRM para la selección firmada',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(150)
  maneuvers?: RouteManeuver[];

  @ApiProperty({ enum: [true] })
  @Equals(true)
  publicMeetingPoints!: true;
}

export class RouteOptionsDto extends PickType(ItineraryDto, [
  'direction',
  'origin',
  'destination',
  'stops',
  'publicMeetingPoints',
] as const) {}
