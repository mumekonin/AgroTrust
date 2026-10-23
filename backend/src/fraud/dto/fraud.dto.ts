import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { FraudFlagStatus } from '../schema/fraud-flag.schema.js';

const REVIEW_STATUSES = [FraudFlagStatus.REVIEWING, FraudFlagStatus.RESOLVED] as const;

export class ListFlagQuery {
  @IsOptional()
  @IsIn(Object.values(FraudFlagStatus))
  status?: FraudFlagStatus;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  severity?: string;

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

export class ResolveFlagDto {
  @IsIn(REVIEW_STATUSES)
  status!: (typeof REVIEW_STATUSES)[number];
}
