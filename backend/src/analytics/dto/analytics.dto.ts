import { IsIn, IsMongoId, IsOptional, Matches } from 'class-validator';

const SNAPSHOT_LEVELS = ['national', 'region', 'woreda', 'center', 'distributor'] as const;

export class AnalyticsQuery {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsMongoId()
  seasonId?: string;

  @IsOptional()
  @IsIn(SNAPSHOT_LEVELS)
  level?: (typeof SNAPSHOT_LEVELS)[number];
}
