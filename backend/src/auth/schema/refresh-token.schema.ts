import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'refresh_tokens', timestamps: true })
export class RefreshToken {
  @Prop({ type: String, required: true })
  sid: string;

  @Prop({ type: String, required: true })
  family: string;

  @Prop({ type: String, required: true })
  tokenHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: Types.ObjectId })
  replacedBy?: Types.ObjectId;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
RefreshTokenSchema.index({ family: 1 });
RefreshTokenSchema.index({ sid: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86_400 });