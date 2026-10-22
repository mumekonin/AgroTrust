import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'sessions', timestamps: true })
export class AuthSession {
  @Prop({ type: String, required: true })
  sid: string;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  
  @Prop({ type: String, required: true })
  role: string;
  @Prop({ type: String, required: true })
  family: string;

  @Prop({ type: String, required: true })
  deviceId: string;

  @Prop({ type: String })
  deviceLabel?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: Date, required: true })
  lastSeenAt: Date;

  @Prop({ type: Date, required: true })
  absoluteExpiresAt: Date;

  @Prop({ type: Date })
  stepUpUntil?: Date;

  @Prop({ type: String, required: true })
  authMethod: string;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: String })
  revokedReason?: string;
}

export type AuthSessionDocument = HydratedDocument<AuthSession>;
export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);

AuthSessionSchema.index({ sid: 1 }, { unique: true });
AuthSessionSchema.index({ userId: 1, revokedAt: 1 });

AuthSessionSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 7 * 86_400 });