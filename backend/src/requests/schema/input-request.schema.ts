import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const RequestStatus = {
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REQUISITIONED: 'REQUISITIONED',
  ACCEPTED: 'ACCEPTED',
  PAID: 'PAID',
  IN_TRANSIT: 'IN_TRANSIT',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const REQUEST_STATUSES: RequestStatus[] = Object.values(RequestStatus);

export const RequestChannel = {
  SELF: 'self',
  ASSISTED: 'assisted',
} as const;

export type RequestChannel = (typeof RequestChannel)[keyof typeof RequestChannel];

export const ConsentMethod = {
  APP: 'app',
  SMS_OTP: 'sms_otp',
} as const;

export type ConsentMethod = (typeof ConsentMethod)[keyof typeof ConsentMethod];

@Schema({ _id: false })
export class RequestItem {
  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  qtyKg: number;

  @Prop({ type: Number, min: 0 })
  acceptedQtyKg?: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPriceSantimPerKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  subsidySantimPerKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotalSantim: number;
}
export const RequestItemSchema = SchemaFactory.createForClass(RequestItem);

@Schema({ _id: false })
export class StatusChange {
  @Prop({ type: String, enum: REQUEST_STATUSES, required: true })
  status: RequestStatus;

  @Prop({ type: Date, required: true })
  at: Date;

  @Prop({ type: Types.ObjectId })
  actorId?: Types.ObjectId;

  @Prop({ type: String })
  reason?: string;
}
export const StatusChangeSchema = SchemaFactory.createForClass(StatusChange);

@Schema({ _id: false })
export class SubmittedBy {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  role: string;
}
export const SubmittedBySchema = SchemaFactory.createForClass(SubmittedBy);

@Schema({ _id: false })
export class RequestConsent {
  @Prop({ type: String, enum: Object.values(ConsentMethod), required: true })
  method: ConsentMethod;

  @Prop({ type: Types.ObjectId })
  otpChallengeId?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  confirmedAt: Date;
}
export const RequestConsentSchema = SchemaFactory.createForClass(RequestConsent);

@Schema({ collection: 'input_requests', timestamps: true })
export class InputRequest {
  @Prop({ type: String, required: true, trim: true })
  requestNo: string;

  @Prop({ type: Types.ObjectId, required: true })
  farmerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  localCenterId: Types.ObjectId;

  @Prop({ type: [RequestItemSchema], required: true })
  items: RequestItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalSantim: number;

  @Prop({ type: Number, required: true, min: 0 })
  subsidySantim: number;

  @Prop({ type: Number, required: true, min: 0 })
  payableSantim: number;

  @Prop({ type: String, enum: REQUEST_STATUSES, required: true })
  status: RequestStatus;

  @Prop({ type: Boolean, default: false })
  waitlisted: boolean;

  @Prop({ type: [StatusChangeSchema], default: [] })
  statusHistory: StatusChange[];

  @Prop({ type: String, enum: Object.values(RequestChannel), required: true })
  channel: RequestChannel;

  @Prop({ type: SubmittedBySchema, required: true })
  submittedBy: SubmittedBy;

  @Prop({ type: RequestConsentSchema, required: true })
  consent: RequestConsent;

  @Prop({ type: Types.ObjectId })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: Types.ObjectId })
  requisitionId?: Types.ObjectId;

  @Prop({ type: Date })
  paymentDueAt?: Date;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: String })
  pickupCodeHash?: string;

  @Prop({ type: Number, default: 0 })
  pickupAttempts: number;

  @Prop({ type: Date })
  pickupExpiresAt?: Date;

  @Prop({ type: String, required: true })
  idempotencyKey: string;

  createdAt?: Date;
}

export type InputRequestDocument = HydratedDocument<InputRequest>;
export const InputRequestSchema = SchemaFactory.createForClass(InputRequest);

InputRequestSchema.index({ requestNo: 1 }, { unique: true });
InputRequestSchema.index({ farmerId: 1, idempotencyKey: 1 }, { unique: true });
InputRequestSchema.index({ farmerId: 1, createdAt: -1 });
InputRequestSchema.index({ localCenterId: 1, status: 1, createdAt: 1 });
InputRequestSchema.index({ requisitionId: 1, status: 1 });
InputRequestSchema.index({ status: 1, paymentDueAt: 1 });
InputRequestSchema.index({ status: 1, pickupExpiresAt: 1 });

@Schema({ collection: 'request_counters' })
export class RequestCounter {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: true, default: 0 })
  seq: number;
}

export type RequestCounterDocument = HydratedDocument<RequestCounter>;
export const RequestCounterSchema = SchemaFactory.createForClass(RequestCounter);

RequestCounterSchema.index({ key: 1 }, { unique: true });
