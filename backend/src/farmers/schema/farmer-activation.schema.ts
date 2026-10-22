import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const ACTIVATION_TTL_MS = 48 * 3_600_000;
export const ACTIVATION_ATTEMPTS = 5;

@Schema({ collection: 'farmer_activations', timestamps: true })
export class FarmerActivation {
  @Prop({ type: Types.ObjectId, required: true })
  farmerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  activationCodeHash: string;

  @Prop({ type: Types.ObjectId, required: true })
  issuedBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  issuedAt: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Date })
  usedAt?: Date;
}

export type FarmerActivationDocument = HydratedDocument<FarmerActivation>;
export const FarmerActivationSchema = SchemaFactory.createForClass(FarmerActivation);

FarmerActivationSchema.index({ farmerId: 1, issuedAt: -1 });
FarmerActivationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
