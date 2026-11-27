import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class DemoLoginDto {
  @ApiProperty({ enum: ['ana', 'diego', 'laura', 'sara'] })
  @IsIn(['ana', 'diego', 'laura', 'sara'])
  identity!: string;
}
