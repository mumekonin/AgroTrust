import type { Types } from 'mongoose';
import type { PaymentProvider, PaymentStatus } from '../schema/payment.schema.js';

export interface PaymentResponse {
  id: string;
  paymentNo: string;
  requestId: string;
  farmerId: string;
  amountSantim: number;
  provider: PaymentProvider;
  slipNo: string;
  status: PaymentStatus;
  confirmedAt: Date;
}

export interface PaymentListResponse {
  items: PaymentResponse[];
  nextCursor?: string;
}

export function toPaymentResponse(doc: {
  id?: string;
  _id?: Types.ObjectId;
  paymentNo: string;
  requestId: Types.ObjectId | string;
  farmerId: Types.ObjectId | string;
  amountSantim: number;
  provider: PaymentProvider;
  providerRef: string;
  status: PaymentStatus;
  confirmedAt: Date;
}): PaymentResponse {
  return {
    id: doc.id ?? String(doc._id),
    paymentNo: doc.paymentNo,
    requestId: String(doc.requestId),
    farmerId: String(doc.farmerId),
    amountSantim: doc.amountSantim,
    provider: doc.provider,
    slipNo: doc.providerRef,
    status: doc.status,
    confirmedAt: doc.confirmedAt,
  };
}
