import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'trusted_devices', timestamps: false })
export class TrustedDevice {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  deviceIdHash: string;

  @Prop({ type: String })
  label?: string;

  @Prop({ type: Date, required: true })
  firstSeenAt: Date;

  @Prop({ type: Date, required: true })
  lastSeenAt: Date;

  @Prop({ type: Date, required: true })
  trustedUntil: Date;

  @Prop({ type: Date })
  revokedAt?: Date;
}

export type TrustedDeviceDocument = HydratedDocument<TrustedDevice>;
export const TrustedDeviceSchema = SchemaFactory.createForClass(TrustedDevice);

TrustedDeviceSchema.index({ userId: 1, deviceIdHash: 1 }, { unique: true });
