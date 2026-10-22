import type { Types } from 'mongoose';
import type { ConsentMethod, RequestChannel, RequestStatus } from '../schema/input-request.schema.js';

export interface RequestItemResponse {
  inputId: string;
  qtyKg: number;
  acceptedQtyKg?: number;
  unitPriceSantimPerKg: number;
  subsidySantimPerKg: number;
  lineTotalSantim: number;
}

export interface RequestResponse {
  id: string;
  requestNo: string;
  farmerId: string;
  seasonId: string;
  localCenterId: string;
  items: RequestItemResponse[];
  totalSantim: number;
  subsidySantim: number;
  payableSantim: number;
  status: RequestStatus;
  waitlisted: boolean;
  channel: RequestChannel;
  submittedBy: { userId: string; role: string };
  consent: { method: ConsentMethod; confirmedAt: Date };
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  statusHistory: { status: RequestStatus; at: Date; actorId?: string; reason?: string }[];
  createdAt?: Date;
}

export interface RequestListResponse {
  items: RequestResponse[];
  nextCursor?: string;
}

export interface AssistedChallengeResponse {
  id: string;
}

export function toRequestResponse(request: {
  id?: string;
  _id?: Types.ObjectId;
  requestNo: string;
  farmerId: Types.ObjectId | string;
  seasonId: Types.ObjectId | string;
  localCenterId: Types.ObjectId | string;
  items: Array<{
    inputId: Types.ObjectId | string;
    qtyKg: number;
    acceptedQtyKg?: number;
    unitPriceSantimPerKg: number;
    subsidySantimPerKg: number;
    lineTotalSantim: number;
  }>;
  totalSantim: number;
  subsidySantim: number;
  payableSantim: number;
  status: RequestStatus;
  waitlisted: boolean;
  channel: RequestChannel;
  submittedBy: { userId: Types.ObjectId | string; role: string };
  consent: { method: ConsentMethod; confirmedAt: Date };
  reviewedBy?: Types.ObjectId | string;
  reviewedAt?: Date;
  rejectionReason?: string;
  statusHistory?: Array<{
    status: RequestStatus;
    at: Date;
    actorId?: Types.ObjectId | string;
    reason?: string;
  }>;
  createdAt?: Date;
}): RequestResponse {
  return {
    id: request.id ?? String(request._id),
    requestNo: request.requestNo,
    farmerId: String(request.farmerId),
    seasonId: String(request.seasonId),
    localCenterId: String(request.localCenterId),
    items: request.items.map((item) => ({
      inputId: String(item.inputId),
      qtyKg: item.qtyKg,
      acceptedQtyKg: item.acceptedQtyKg,
      unitPriceSantimPerKg: item.unitPriceSantimPerKg,
      subsidySantimPerKg: item.subsidySantimPerKg,
      lineTotalSantim: item.lineTotalSantim,
    })),
    totalSantim: request.totalSantim,
    subsidySantim: request.subsidySantim,
    payableSantim: request.payableSantim,
    status: request.status,
    waitlisted: request.waitlisted,
    channel: request.channel,
    submittedBy: { userId: String(request.submittedBy.userId), role: request.submittedBy.role },
    consent: { method: request.consent.method, confirmedAt: request.consent.confirmedAt },
    reviewedBy: request.reviewedBy ? String(request.reviewedBy) : undefined,
    reviewedAt: request.reviewedAt,
    rejectionReason: request.rejectionReason,
    statusHistory: (request.statusHistory ?? []).map((entry) => ({
      status: entry.status,
      at: entry.at,
      actorId: entry.actorId ? String(entry.actorId) : undefined,
      reason: entry.reason,
    })),
    createdAt: request.createdAt,
  };
}
