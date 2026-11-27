import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  FeedTab,
  MobilityPreferenceInput,
  TripDirection,
  VehicleType,
} from '@ruteam/contracts';

export class MobilityPreferenceDto implements MobilityPreferenceInput {
  @ApiProperty() @IsString() @Length(2, 80) label!: string;
  @ApiProperty() @IsUUID() campusPointId!: string;
  @ApiProperty({ enum: ['DESDE_USC', 'HACIA_USC'] })
  @IsIn(['DESDE_USC', 'HACIA_USC'])
  direction!: TripDirection;
  @ApiProperty({ type: [Number], description: 'ISO: lunes1 a domingo7' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  days!: number[];
  @ApiProperty() @IsInt() @Min(0) @Max(1439) startMinute!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(1439) endMinute!: number;
  @ApiProperty() @IsString() @Length(2, 160) placeLabel!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude?: number | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude?: number | null;
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.001)
  @Max(3.999)
  radiusKm!: number;
  @ApiProperty({ type: [String], enum: ['CAR', 'MOTORCYCLE'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['CAR', 'MOTORCYCLE'], { each: true })
  vehicleTypes!: VehicleType[];
  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 2147483647 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  maxContributionCop?: number | null;
  @ApiProperty() @IsBoolean() notificationsEnabled!: boolean;
  @ApiProperty() @IsBoolean() active!: boolean;
}
export class FeedQueryDto {
  @ApiPropertyOptional({ enum: ['FOR_YOU', 'ALL', 'DESDE_USC', 'HACIA_USC'] })
  @IsOptional()
  @IsIn(['FOR_YOU', 'ALL', 'DESDE_USC', 'HACIA_USC'])
  tab?: FeedTab;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  cursor?: string;
}
export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  cursor?: string;
}
