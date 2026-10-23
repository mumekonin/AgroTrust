import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const OverrideStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
} as const;

export type OverrideStatus = (typeof OverrideStatus)[keyof typeof OverrideStatus];

@Schema({ collection: 'pickup_overrides', timestamps: true })
export class PickupOverride {
  @Prop({ type: Types.ObjectId, required: true })
  requestId: Types.ObjectId;

  @Prop({ type: String, required: true })
  requestNo: string;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Types.ObjectId, required: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(OverrideStatus), required: true })
  status: OverrideStatus;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;

  @Prop({ type: String, required: true })
  idempotencyKey: string;

  createdAt?: Date;
}

export type PickupOverrideDocument = HydratedDocument<PickupOverride>;
export const PickupOverrideSchema = SchemaFactory.createForClass(PickupOverride);

PickupOverrideSchema.index({ requestId: 1, status: 1 });
PickupOverrideSchema.index({ idempotencyKey: 1 }, { unique: true });
