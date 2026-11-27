import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
export class AccountEmailDto {
  @ApiProperty({ example: 'estudiante@usc.edu.co' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(3, 254)
  email!: string;
}
export class AccountLoginDto extends AccountEmailDto {
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128)
  password!: string;
}
export class AccountRegisterDto extends AccountLoginDto {
  @ApiProperty() @IsString() @Length(2, 80) name!: string;
  @ApiProperty({ enum: ['PASSENGER', 'DRIVER_AND_PASSENGER'] })
  @IsIn(['PASSENGER', 'DRIVER_AND_PASSENGER'])
  usagePreference!: 'PASSENGER' | 'DRIVER_AND_PASSENGER';
}
export class AccountTokenDto {
  @ApiProperty() @IsString() @Length(43, 43) token!: string;
}
export class AccountResetDto extends AccountTokenDto {
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128)
  password!: string;
}
export class OnboardingDto {
  @ApiProperty({ minimum: 0, maximum: 4 })
  @IsInt()
  @Min(0)
  @Max(4)
  step!: number;
  @ApiPropertyOptional({ enum: ['PASSENGER', 'DRIVER_AND_PASSENGER'] })
  @IsOptional()
  @IsIn(['PASSENGER', 'DRIVER_AND_PASSENGER'])
  usagePreference?: 'PASSENGER' | 'DRIVER_AND_PASSENGER';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() complete?: boolean;
}
