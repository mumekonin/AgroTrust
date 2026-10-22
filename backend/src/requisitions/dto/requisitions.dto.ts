import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
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
import { REQUISITION_STATUSES, type RequisitionStatus } from '../schema/requisition.schema.js';

export class CreateRequisitionDto {
  @IsMongoId()
  seasonId!: string;

  @IsMongoId()
  localCenterId!: string;

  @IsIn(INPUT_CATEGORIES)
  inputCategory!: InputCategory;

  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}

export class RespondLineDto {
  @IsMongoId()
  inputId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  acceptedKg!: number;
}

export class RespondRequisitionDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RespondLineDto)
  lines!: RespondLineDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}

export class ListRequisitionQuery {
  @IsOptional()
  @IsIn(REQUISITION_STATUSES)
  status?: RequisitionStatus;

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
