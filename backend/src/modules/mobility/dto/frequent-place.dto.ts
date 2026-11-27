import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Length, Max, Min } from 'class-validator';
import type { FrequentPlaceInput, FrequentPlaceKind } from '@ruteam/contracts';

const kinds = [
  'HOME_AREA',
  'PICKUP',
  'DROPOFF',
  'PUBLIC_REFERENCE',
  'FAVORITE',
];

export class FrequentPlaceDto implements FrequentPlaceInput {
  @ApiProperty() @IsString() @Length(2, 80) name!: string;
  @ApiProperty() @IsString() @Length(2, 160) placeLabel!: string;
  @ApiProperty({ enum: kinds }) @IsIn(kinds) kind!: FrequentPlaceKind;
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude!: number;
}
