import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ALL_ROLES, Role } from '../../common/enums/role.enum.js';

export const UserStatus = {
  INVITED: 'invited',
  PENDING_ACTIVATION: 'pending_activation',
  ACTIVE: 'active',
  LOCKED: 'locked',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const PreferredLanguage = {
  EN: 'en',
  AM: 'am',
  OM: 'om',
} as const;

export type PreferredLanguage = (typeof PreferredLanguage)[keyof typeof PreferredLanguage];

@Schema({ _id: false })
export class UserScope {
  @Prop({ type: [Types.ObjectId], default: [] })
  regionIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], default: [] })
  woredaIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], default: [] })
  localCenterIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId })
  distributorId?: Types.ObjectId;
}
export const UserScopeSchema = SchemaFactory.createForClass(UserScope);

@Schema({ _id: false })
export class UserMfa {
  @Prop({ type: Boolean, default: false })
  totpEnabled: boolean;

  @Prop({ type: Boolean, default: false })
  smsFallbackAllowed: boolean;
}
export const UserMfaSchema = SchemaFactory.createForClass(UserMfa);

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({ type: String, trim: true, lowercase: true })
  email?: string;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: [String], enum: ALL_ROLES, required: true })
  roles: Role[];

  @Prop({ type: UserScopeSchema, default: () => ({}) })
  scope: UserScope;

  @Prop({ type: Number, default: 1 })
  roleVersion: number;

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING_ACTIVATION,
  })
  status: UserStatus;

  @Prop({
    type: String,
    enum: Object.values(PreferredLanguage),
    default: PreferredLanguage.EN,
  })
  preferredLanguage: PreferredLanguage;

  @Prop({ type: Date })
  phoneVerifiedAt?: Date;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: Date })
  lastAuthAt?: Date;

  @Prop({ type: UserMfaSchema, default: () => ({}) })
  mfa: UserMfa;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ roles: 1, status: 1 });