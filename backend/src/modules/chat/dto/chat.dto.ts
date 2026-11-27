import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChatPageDto {
  @ApiPropertyOptional({ description: 'Cursor opaco de la página anterior' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  cursor?: string;
}

export class SendChatMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  clientMessageId!: string;

  @ApiProperty({ minLength: 1, maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

export class ReadChatDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  messageId!: string;
}
