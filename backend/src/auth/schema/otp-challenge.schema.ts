import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** §3.4, plus the staff-login and enrolment challenges those flows require. */
export const OtpPurpose = {
  LOGIN_NEW_DEVICE: 'login_new_device',
  ACTIVATION: 'activation',
  PIN_RESET: 'pin_reset',
  PASSWORD_RESET: 'password_reset',
  PHONE_CHANGE: 'phone_change',
  ASSISTED_REQUEST: 'assisted_request',
  STEP_UP: 'step_up',
  SMS_FALLBACK: 'sms_fallback',
  LOGIN_MFA: 'login_mfa',
  INVITATION: 'invitation',
  MFA_ENROLL: 'mfa_enroll',
} as const;

export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

@Schema({ collection: 'otp_challenges', timestamps: true })
export class OtpChallenge {
  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String, enum: Object.values(OtpPurpose), required: true })
  purpose: OtpPurpose;

  @Prop({ type: String, required: true })
  codeHash: string;

  @Prop({ type: String })
  payloadHash?: string;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Number, default: 3 })
  maxAttempts: number;

  @Prop({ type: Number, default: 0 })
  resendCount: number;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  consumedAt?: Date;

  @Prop({ type: Date })
  createdAt?: Date;
}

export type OtpChallengeDocument = HydratedDocument<OtpChallenge>;
export const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);

OtpChallengeSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
OtpChallengeSchema.index({ codeHash: 1 });
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
