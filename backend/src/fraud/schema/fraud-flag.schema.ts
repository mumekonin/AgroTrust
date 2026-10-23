import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const FraudFlagStatus = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
} as const;

export type FraudFlagStatus = (typeof FraudFlagStatus)[keyof typeof FraudFlagStatus];

@Schema({ collection: 'fraud_flags', timestamps: true })
export class FraudFlag {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  severity: string;

  @Prop({ type: Types.ObjectId })
  localCenterId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  distributorId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  shipmentId?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  details: Record<string, unknown>;

  @Prop({ type: String, enum: Object.values(FraudFlagStatus), required: true })
  status: FraudFlagStatus;

  createdAt?: Date;
}

export type FraudFlagDocument = HydratedDocument<FraudFlag>;
export const FraudFlagSchema = SchemaFactory.createForClass(FraudFlag);

FraudFlagSchema.index({ status: 1, severity: 1, createdAt: -1 });
FraudFlagSchema.index({ shipmentId: 1 });
