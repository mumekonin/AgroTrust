import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const PaymentProvider = {
  BANK: 'bank',
} as const;

export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PAYMENT_PROVIDERS: PaymentProvider[] = Object.values(PaymentProvider);

export const PaymentStatus = {
  CONFIRMED: 'confirmed',
  REFUNDED: 'refunded',
  CREDIT: 'credit',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PAYMENT_STATUSES: PaymentStatus[] = Object.values(PaymentStatus);

@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  @Prop({ type: String, required: true, trim: true })
  paymentNo: string;

  @Prop({ type: Types.ObjectId, required: true })
  requestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  farmerId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amountSantim: number;

  @Prop({ type: String, enum: PAYMENT_PROVIDERS, required: true })
  provider: PaymentProvider;

  @Prop({ type: String, required: true, trim: true })
  providerRef: string;

  @Prop({ type: String, enum: PAYMENT_STATUSES, required: true })
  status: PaymentStatus;

  @Prop({ type: String, required: true })
  idempotencyKey: string;

  @Prop({ type: Date, required: true })
  initiatedAt: Date;

  @Prop({ type: Date, required: true })
  confirmedAt: Date;

  createdAt?: Date;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ paymentNo: 1 }, { unique: true });
PaymentSchema.index({ provider: 1, providerRef: 1 }, { unique: true });
PaymentSchema.index({ idempotencyKey: 1 }, { unique: true });
PaymentSchema.index({ requestId: 1 });
PaymentSchema.index({ status: 1, initiatedAt: 1 });
