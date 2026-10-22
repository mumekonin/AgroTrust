import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  PRIORITY_POLICIES,
  SEASON_STATUSES,
  type PriorityPolicy,
  type SeasonStatus,
} from '../schema/season.schema.js';

export class CreateSeasonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsDateString()
  requestsOpenAt!: string;

  @IsDateString()
  requestsCloseAt!: string;

  @IsDateString()
  requisitionCutoffAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentWindowDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pickupWindowDays!: number;

  @IsOptional()
  @IsIn(PRIORITY_POLICIES)
  priorityPolicy?: PriorityPolicy;

  @IsOptional()
  @IsIn(SEASON_STATUSES)
  status?: SeasonStatus;
}

export class ReplaceSeasonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsDateString()
  requestsOpenAt!: string;

  @IsDateString()
  requestsCloseAt!: string;

  @IsDateString()
  requisitionCutoffAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentWindowDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pickupWindowDays!: number;

  @IsIn(PRIORITY_POLICIES)
  priorityPolicy!: PriorityPolicy;

  @IsIn(SEASON_STATUSES)
  status!: SeasonStatus;
}

export class ListSeasonQuery {
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
