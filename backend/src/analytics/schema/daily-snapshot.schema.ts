import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

const SNAPSHOT_LEVELS = ['national', 'region', 'woreda', 'center', 'distributor'] as const;
type SnapshotLevel = (typeof SNAPSHOT_LEVELS)[number];

@Schema({ collection: 'daily_snapshots' })
export class DailySnapshot {
  @Prop({ type: String, required: true })
  date: string;

  @Prop({ type: String, enum: SNAPSHOT_LEVELS, required: true })
  level: SnapshotLevel;

  @Prop({ type: String, required: true })
  geoId: string;

  @Prop({ type: String, required: true })
  inputId: string;

  @Prop({ type: String, required: true })
  seasonId: string;

  @Prop({ type: Number, required: true, min: 0 })
  requestedKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  acceptedKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  paidKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  dispatchedKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  receivedKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  handedOverKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  onHandKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  requestCount: number;

  @Prop({ type: Number, required: true, min: 0 })
  avgCycleDays: number;
}

export type DailySnapshotDocument = HydratedDocument<DailySnapshot>;
export const DailySnapshotSchema = SchemaFactory.createForClass(DailySnapshot);

DailySnapshotSchema.index({ date: 1, level: 1, geoId: 1, inputId: 1, seasonId: 1 }, { unique: true });
DailySnapshotSchema.index({ date: 1, level: 1, geoId: 1 });
