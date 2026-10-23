import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PAYMENT_STATUSES, type PaymentStatus } from '../schema/payment.schema.js';

export class ConfirmPaymentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slipNo!: string;
}

export class ListPaymentQuery {
  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: PaymentStatus;

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
