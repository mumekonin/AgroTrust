import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAllocationRuleDto {
  @IsMongoId()
  seasonId!: string;

  @IsMongoId()
  inputId!: string;

  @IsOptional()
  @IsMongoId()
  regionId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rateKgPerHa!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minKg!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  maxHa!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxKgPerFarmer!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  cropFilter?: string;

  @IsDateString()
  effectiveFrom!: string;
}

export class GenerateAllocationsDto {
  @IsMongoId()
  ruleId!: string;
}

export class AdjustAllocationDto {
  @IsMongoId()
  farmerId!: string;

  @IsMongoId()
  seasonId!: string;

  @IsMongoId()
  inputId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  entitledKg!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class ListAllocationQuery {
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
