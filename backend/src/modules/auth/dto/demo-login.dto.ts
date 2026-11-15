import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class DemoLoginDto {
  @ApiProperty({ enum: ['ana', 'diego', 'laura', 'admin'] })
  @IsIn(['ana', 'diego', 'laura', 'admin'])
  identity!: string;
}
