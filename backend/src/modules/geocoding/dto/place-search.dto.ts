import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import type { GeocodedPlace, PlaceSearchResponse } from '@ruteam/contracts';

export class PlaceSearchDto {
  @ApiProperty({ minLength: 3, maxLength: 120, example: 'Pampalinda Cali' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 120)
  @Matches(/^[^\p{Cc}\p{Cf}]+$/u, {
    message: 'La consulta de lugar contiene caracteres de control.',
  })
  query!: string;
}

export class GeocodedPlaceDto implements GeocodedPlace {
  @ApiProperty() label!: string;
  @ApiProperty() context!: string;
  @ApiProperty({ minimum: -90, maximum: 90 }) latitude!: number;
  @ApiProperty({ minimum: -180, maximum: 180 }) longitude!: number;
}

export class PlaceSearchResponseDto implements PlaceSearchResponse {
  @ApiProperty({ type: [GeocodedPlaceDto] }) items!: GeocodedPlaceDto[];
  @ApiProperty({ example: 'Datos © OpenStreetMap contributors' })
  attribution!: string;
}
