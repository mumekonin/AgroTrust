import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const CredentialType = {
  PASSWORD: 'password',
  PIN: 'pin',
  TOTP: 'totp',
  RECOVERY_CODES: 'recovery_codes',
} as const;

export type CredentialType = (typeof CredentialType)[keyof typeof CredentialType];

@Schema({ collection: 'credentials', timestamps: true })
export class UserCredential {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(CredentialType), required: true })
  type: CredentialType;

  // password / pin
  @Prop({ type: String })
  hash?: string;

  @Prop({ type: String })
  algo?: string;

  @Prop({ type: Object })
  params?: Record<string, number>;

  @Prop({ type: Boolean, default: false })
  mustChange: boolean;

  @Prop({ type: [String], default: [], select: false })
  history: string[];

  @Prop({ type: Date })
  changedAt?: Date;

  @Prop({ type: String, select: false })
  secretEnc?: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: [String], default: [], select: false })
  codeHashes: string[];

  @Prop({ type: Number, default: 0 })
  usedCount: number;
}

export type UserCredentialDocument = HydratedDocument<UserCredential>;
export const UserCredentialSchema = SchemaFactory.createForClass(UserCredential);

UserCredentialSchema.index({ userId: 1, type: 1 }, { unique: true });