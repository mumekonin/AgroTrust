import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'login_attempts', timestamps: false })
export class LoginAttempt {
  @Prop({ type: String, required: true })
  identifierHash: string;

  @Prop({ type: String, required: true })
  ip: string;

  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ type: Boolean, required: true })
  success: boolean;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Date, required: true })
  at: Date;
}

export type LoginAttemptDocument = HydratedDocument<LoginAttempt>;
export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);

LoginAttemptSchema.index({ identifierHash: 1, at: -1 });
LoginAttemptSchema.index({ ip: 1, at: -1 });
LoginAttemptSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 86_400 });
