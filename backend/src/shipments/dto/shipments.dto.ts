import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
import { SHIPMENT_STATUSES, type ShipmentStatus } from '../schema/shipment.schema.js';

export class CreateBatchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  lotNumber!: string;

  @IsMongoId()
  inputId!: string;

  @IsMongoId()
  seasonId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityKg!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  source!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  importRef?: string;

  @IsOptional()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  documents?: string[];
}

export class ShipmentLineDto {
  @IsMongoId()
  inputId!: string;

  @IsMongoId()
  batchId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qtyKg!: number;
}

export class TransportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  vehiclePlate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  driverName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  driverPhone!: string;
}

export class CreateShipmentDto {
  @IsMongoId()
  requisitionId!: string;

  @IsDateString()
  etaAt!: string;

  @ValidateNested()
  @Type(() => TransportDto)
  transport!: TransportDto;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShipmentLineDto)
  lines!: ShipmentLineDto[];
}

export class UpdateShipmentDto {
  @IsOptional()
  @IsDateString()
  etaAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransportDto)
  transport?: TransportDto;
}

export class ReceivedLineDto {
  @IsMongoId()
  inputId!: string;

  @IsMongoId()
  batchId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  qtyKg!: number;
}

export class ReceiveShipmentDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivedLineDto)
  lines!: ReceivedLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ResolveDiscrepancyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  resolution!: string;
}

export class ListShipmentQuery {
  @IsOptional()
  @IsIn(SHIPMENT_STATUSES)
  status?: ShipmentStatus;

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
