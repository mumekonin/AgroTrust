import { IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class VerifyPickupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  requestNo!: string;

  @IsString()
  @Length(8, 8)
  code!: string;
}

export class CompletePickupDto {
  @IsOptional()
  @IsString()
  @Length(8, 8)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}
