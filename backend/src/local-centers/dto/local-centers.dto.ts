import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CENTER_STATUSES, type CenterStatus } from '../schema/local-center.schema.js';

export class CenterGeoDto {
  @IsMongoId()
  regionId!: string;

  @IsMongoId()
  zoneId!: string;

  @IsMongoId()
  woredaId!: string;

  @IsMongoId()
  kebeleId!: string;
}

export class CenterPointDto {
  @IsIn(['Point'])
  type!: 'Point';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates!: number[];
}

export class CreateCenterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ValidateNested()
  @Type(() => CenterGeoDto)
  geo!: CenterGeoDto;

  @ValidateNested()
  @Type(() => CenterPointDto)
  location!: CenterPointDto;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  address!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  openingHours!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  localAdminUserIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  servesKebeleIds!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacityKg?: number;

  @IsOptional()
  @IsIn(CENTER_STATUSES)
  status?: CenterStatus;
}

export class UpdateCenterDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CenterGeoDto)
  geo?: CenterGeoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CenterPointDto)
  location?: CenterPointDto;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  openingHours?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  localAdminUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  servesKebeleIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacityKg?: number;

  @IsOptional()
  @IsIn(CENTER_STATUSES)
  status?: CenterStatus;
}

export class ListCenterQuery {
  @IsOptional()
  @IsIn(CENTER_STATUSES)
  status?: CenterStatus;

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
