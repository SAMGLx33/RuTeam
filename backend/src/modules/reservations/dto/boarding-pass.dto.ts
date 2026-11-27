import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import type { RedeemBoardingPassInput } from '@ruteam/contracts';
import { boardingPassPattern } from '../infrastructure/boarding-pass-token.js';

export class RedeemBoardingPassDto implements RedeemBoardingPassInput {
  @ApiProperty({ minLength: 59, maxLength: 59 })
  @IsString()
  @Matches(boardingPassPattern, {
    message: 'Escanea un QR de abordaje de RuTeam',
  })
  code!: string;
}
