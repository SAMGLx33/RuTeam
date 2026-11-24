import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SearchTripsDto {
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
