import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import type { TripDirection } from '@ruteam/contracts';

export class SearchTripsDto {
  @ApiPropertyOptional({ enum: ['DESDE_USC', 'HACIA_USC'] })
  @IsOptional()
  @IsIn(['DESDE_USC', 'HACIA_USC'])
  direction?: TripDirection;

  @ApiPropertyOptional({
    description: 'Nombre o referencia del punto de abordaje',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fromText?: string;

  @ApiPropertyOptional({
    description: 'Nombre o referencia del punto de descenso',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  toText?: string;

  @ApiPropertyOptional({
    description:
      'Marcador próximo a la geometría publicada, como latitud,longitud',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  near?: string;

  @ApiPropertyOptional({
    description: 'USC, UUID de punto institucional o latitud,longitud',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  from?: string;

  @ApiPropertyOptional({
    description: 'USC, UUID de punto institucional o latitud,longitud',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  to?: string;

  @ApiPropertyOptional({
    description:
      'Radio en km (0–4, extremos excluidos). Obligatorio al usar coordenadas.',
  })
  @IsOptional()
  @IsNumberString()
  radiusKm?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  after?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  before?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 4 })
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  seats?: string;

  @ApiPropertyOptional({
    description: 'Cursor devuelto por la consulta anterior',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  cursor?: string;
}
