import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { NOTIFICATION_STATUSES, type NotificationStatus } from '../schema/notification.schema.js';

export class ListNotificationQuery {
  @IsOptional()
  @IsIn(NOTIFICATION_STATUSES)
  status?: NotificationStatus;

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

export class DeliveryReportDto {
  @IsString()
  @MaxLength(128)
  providerMessageId!: string;

  @IsIn(['delivered', 'failed'])
  status!: 'delivered' | 'failed';
}
