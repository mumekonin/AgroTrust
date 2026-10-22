import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** A single-farmer correction. Past rule versions are never rewritten. */
@Schema({ collection: 'allocation_adjustments', timestamps: { createdAt: true, updatedAt: false } })
export class AllocationAdjustment {
  @Prop({ type: Types.ObjectId, required: true })
  allocationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  farmerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  previousEntitledKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  entitledKg: number;

  @Prop({ type: String, required: true, trim: true })
  reason: string;

  @Prop({ type: Types.ObjectId, required: true })
  actorId: Types.ObjectId;
}

export type AllocationAdjustmentDocument = HydratedDocument<AllocationAdjustment>;
export const AllocationAdjustmentSchema = SchemaFactory.createForClass(AllocationAdjustment);

AllocationAdjustmentSchema.index({ allocationId: 1, createdAt: -1 });
