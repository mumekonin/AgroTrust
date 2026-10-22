import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ALL_ROLES, Role } from '../../common/enums/role.enum.js';
import { UserScope, UserScopeSchema } from '../../users/schema/user.schema.js';

export const InvitationStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  USED: 'used',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type InvitationStatus =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];

@Schema({ collection: 'invitations', timestamps: true })
export class Invitation {
  @Prop({ type: String })
  tokenHash?: string;

  @Prop({ type: String, enum: ALL_ROLES, required: true })
  role: Role;

  @Prop({ type: UserScopeSchema, default: () => ({}) })
  scope: UserScope;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: Types.ObjectId })
  boundUserId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;
}

export type InvitationDocument = HydratedDocument<Invitation>;
export const InvitationSchema = SchemaFactory.createForClass(Invitation);

InvitationSchema.index({ tokenHash: 1 }, { unique: true, sparse: true });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
