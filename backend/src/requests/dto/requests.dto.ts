import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { REQUEST_STATUSES, type RequestStatus } from '../schema/input-request.schema.js';

export class RequestItemDto {
  @IsMongoId()
  inputId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qtyKg!: number;
}

export class CreateRequestDto {
  @IsMongoId()
  seasonId!: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RequestItemDto)
  items!: RequestItemDto[];
}

export class AssistedRequestDto extends CreateRequestDto {
  @IsMongoId()
  farmerId!: string;
}

export class ConfirmAssistedRequestDto extends AssistedRequestDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class RejectRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class ListRequestQuery {
  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: RequestStatus;

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
