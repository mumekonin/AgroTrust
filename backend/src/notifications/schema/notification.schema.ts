import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const NotificationLanguage = {
  EN: 'en',
  AM: 'am',
  OM: 'om',
} as const;

export type NotificationLanguage =
  (typeof NotificationLanguage)[keyof typeof NotificationLanguage];

export const NOTIFICATION_LANGUAGES: NotificationLanguage[] = Object.values(NotificationLanguage);

export const NotificationEvent = {
  ACCOUNT_VERIFIED: 'ACCOUNT_VERIFIED',
  ACTIVATION_CODE: 'ACTIVATION_CODE',
  REQUEST_RECEIVED: 'REQUEST_RECEIVED',
  REQUEST_APPROVED: 'REQUEST_APPROVED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_DECLINED: 'REQUEST_DECLINED',
  REQUEST_WAITLISTED: 'REQUEST_WAITLISTED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_REMINDER: 'PAYMENT_REMINDER',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  REQUEST_EXPIRED_UNPAID: 'REQUEST_EXPIRED_UNPAID',
  SHIPMENT_DISPATCHED: 'SHIPMENT_DISPATCHED',
  GOODS_ARRIVED: 'GOODS_ARRIVED',
  PICKUP_REMINDER: 'PICKUP_REMINDER',
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
  REQUEST_REFUNDED: 'REQUEST_REFUNDED',
  ASSISTED_REQUEST_OTP: 'ASSISTED_REQUEST_OTP',
  LOGIN_OTP: 'LOGIN_OTP',
  PIN_RESET_OTP: 'PIN_RESET_OTP',
} as const;

export type NotificationEvent = (typeof NotificationEvent)[keyof typeof NotificationEvent];

export const NOTIFICATION_EVENTS: NotificationEvent[] = Object.values(NotificationEvent);

export const NotificationStatus = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  MANUAL: 'manual',
} as const;

export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const NOTIFICATION_STATUSES: NotificationStatus[] = Object.values(NotificationStatus);

export const SECRET_EVENTS: ReadonlySet<NotificationEvent> = new Set([
  NotificationEvent.ACTIVATION_CODE,
  NotificationEvent.GOODS_ARRIVED,
  NotificationEvent.PICKUP_REMINDER,
  NotificationEvent.ASSISTED_REQUEST_OTP,
  NotificationEvent.LOGIN_OTP,
  NotificationEvent.PIN_RESET_OTP,
]);

@Schema({ _id: false })
export class NotificationRecipient {
  @Prop({ type: Types.ObjectId })
  farmerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ type: String })
  phone?: string;
}
export const NotificationRecipientSchema = SchemaFactory.createForClass(NotificationRecipient);

@Schema({ _id: false })
export class NotificationRelated {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  id: string;
}
export const NotificationRelatedSchema = SchemaFactory.createForClass(NotificationRelated);

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ type: NotificationRecipientSchema, required: true })
  recipient: NotificationRecipient;

  @Prop({ type: String, enum: NOTIFICATION_EVENTS, required: true })
  event: NotificationEvent;

  @Prop({ type: String, enum: NOTIFICATION_LANGUAGES, required: true })
  language: NotificationLanguage;

  @Prop({ type: Object, default: {} })
  params: Record<string, string>;

  @Prop({ type: String })
  body?: string;

  @Prop({ type: String, enum: NOTIFICATION_STATUSES, required: true })
  status: NotificationStatus;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Date })
  nextAttemptAt?: Date;

  @Prop({ type: String })
  providerMessageId?: string;

  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: NotificationRelatedSchema, required: true })
  related: NotificationRelated;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ status: 1, nextAttemptAt: 1 });
NotificationSchema.index({ 'related.type': 1, 'related.id': 1, event: 1 }, { unique: true });
NotificationSchema.index({ 'recipient.farmerId': 1, createdAt: -1 });
NotificationSchema.index({ providerMessageId: 1 });
