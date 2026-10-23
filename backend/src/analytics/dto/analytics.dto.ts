import { IsMongoId, IsOptional, Matches } from 'class-validator';

export class AnalyticsQuery {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsMongoId()
  seasonId?: string;
}
