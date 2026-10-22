import { Type } from 'class-transformer';
import {
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';
import { INPUT_CATEGORIES, type InputCategory } from '../schema/input.schema.js';

export class InputNameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  en!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  am!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  om!: string;
}

export class CreateInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @ValidateNested()
  @Type(() => InputNameDto)
  name!: InputNameDto;

  @IsIn(INPUT_CATEGORIES)
  category!: InputCategory;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  packSizeKg!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateInputDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => InputNameDto)
  name?: InputNameDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packSizeKg?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListCatalogQuery {
  @IsMongoId()
  seasonId!: string;

  @IsOptional()
  @IsMongoId()
  regionId?: string;

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

export class CreatePriceDto {
  @IsMongoId()
  inputId!: string;

  @IsMongoId()
  seasonId!: string;

  @IsOptional()
  @IsMongoId()
  regionId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPriceSantimPerKg!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  subsidySantimPerKg!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
