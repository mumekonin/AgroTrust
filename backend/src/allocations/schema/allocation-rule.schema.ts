import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'allocation_rules', timestamps: true })
export class AllocationRule {
  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  /** Null is the national default. A region id is an override. */
  @Prop({ type: Types.ObjectId, default: null })
  regionId: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 0 })
  rateKgPerHa: number;

  @Prop({ type: Number, required: true, min: 0 })
  minKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  maxHa: number;

  @Prop({ type: Number, required: true, min: 0 })
  maxKgPerFarmer: number;

  @Prop({ type: String, trim: true })
  cropFilter?: string;

  @Prop({ type: Number, required: true, min: 1 })
  version: number;

  @Prop({ type: Date, required: true })
  effectiveFrom: Date;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;
}

export type AllocationRuleDocument = HydratedDocument<AllocationRule>;
export const AllocationRuleSchema = SchemaFactory.createForClass(AllocationRule);

AllocationRuleSchema.index({ seasonId: 1, inputId: 1, regionId: 1, version: 1 }, { unique: true });
