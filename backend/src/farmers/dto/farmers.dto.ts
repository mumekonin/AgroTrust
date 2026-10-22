import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
import { FARMER_STATUSES, type FarmerStatus } from '../schema/farmer.schema.js';

export class FarmerGeoDto {
  @IsMongoId()
  regionId!: string;

  @IsMongoId()
  zoneId!: string;

  @IsMongoId()
  woredaId!: string;

  @IsMongoId()
  kebeleId!: string;
}

export class ImportFarmerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  registryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @ValidateNested()
  @Type(() => FarmerGeoDto)
  geo!: FarmerGeoDto;

  @IsMongoId()
  localCenterId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landHoldingHa!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  crops?: string[];

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  sharedPhone?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  idNumber?: string;
}

export class ImportFarmersDto {
  @IsBoolean()
  dryRun!: boolean;

  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportFarmerDto)
  farmers!: ImportFarmerDto[];
}

export class ListFarmersQuery {
  @IsOptional()
  @IsIn(FARMER_STATUSES)
  status?: FarmerStatus;

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

export class ActivateFarmerDto {
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(8)
  activationCode!: string;

  @IsString()
  @MaxLength(12)
  pin!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;
}
