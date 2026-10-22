import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
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
import { INPUT_CATEGORIES, type InputCategory } from '../../catalog/schema/input.schema.js';
import {
  DISTRIBUTOR_STATUSES,
  DISTRIBUTOR_TYPES,
  type DistributorStatus,
  type DistributorType,
} from '../schema/distributor.schema.js';

export class DistributorContactDto {
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class CreateDistributorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(DISTRIBUTOR_TYPES)
  type!: DistributorType;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  licenceNo!: string;

  @ValidateNested()
  @Type(() => DistributorContactDto)
  contact!: DistributorContactDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  serviceRegionIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bankAccountRef?: string;

  @IsOptional()
  @IsIn(DISTRIBUTOR_STATUSES)
  status?: DistributorStatus;
}

export class UpdateDistributorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  licenceNo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DistributorContactDto)
  contact?: DistributorContactDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  serviceRegionIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bankAccountRef?: string;

  @IsOptional()
  @IsIn(DISTRIBUTOR_STATUSES)
  status?: DistributorStatus;
}

export class CreateAssignmentDto {
  @IsMongoId()
  seasonId!: string;

  @IsMongoId()
  localCenterId!: string;

  @IsIn(INPUT_CATEGORIES)
  inputCategory!: InputCategory;

  @IsMongoId()
  distributorId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority!: number;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsMongoId()
  distributorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;
}

export class ListDistributorQuery {
  @IsOptional()
  @IsIn(DISTRIBUTOR_STATUSES)
  status?: DistributorStatus;

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

export class ListAssignmentQuery {
  @IsOptional()
  @IsMongoId()
  seasonId?: string;

  @IsOptional()
  @IsMongoId()
  localCenterId?: string;

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
