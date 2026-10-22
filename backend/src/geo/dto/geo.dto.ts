import { Type } from 'class-transformer';
import {
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
import { GEO_TYPES, type GeoType } from '../schema/geo-unit.schema.js';

export class GeoNameDto {
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

export class CreateGeoDto {
  @IsIn(GEO_TYPES)
  type!: GeoType;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @ValidateNested()
  @Type(() => GeoNameDto)
  name!: GeoNameDto;

  @IsOptional()
  @IsMongoId()
  parentId?: string;
}

export class UpdateGeoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoNameDto)
  name?: GeoNameDto;
}

export class ListGeoQuery {
  @IsOptional()
  @IsMongoId()
  parentId?: string;

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
