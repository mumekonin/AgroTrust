import type { Types } from 'mongoose';
import type { InputCategory } from '../../catalog/schema/input.schema.js';
import type { ProcessingState, ProcessingStep, RequisitionStatus } from '../schema/requisition.schema.js';

export interface RequisitionLineResponse {
  inputId: string;
  requestedKg: number;
  acceptedKg: number;
  paidKg: number;
  shippedKg: number;
  receivedKg: number;
}

export interface RequisitionResponse {
  id: string;
  requisitionNo: string;
  localCenterId: string;
  distributorId: string;
  seasonId: string;
  inputCategory: InputCategory;
  lines: RequisitionLineResponse[];
  requestCount: number;
  status: RequisitionStatus;
  processing?: { step: ProcessingStep; processed: number; total: number; status: ProcessingState };
  responseReason?: string;
  createdAt?: Date;
}

export interface RequisitionListResponse {
  items: RequisitionResponse[];
  nextCursor?: string;
}

export interface PreviewResponse {
  distributorId: string;
  requestCount: number;
  lines: { inputId: string; requestedKg: number }[];
}

export interface FarmerEligibility {
  farmerId: string;
  fullName: string;
  registryId: string;
  kebeleId: string;
  kebeleName?: string;
  requestNo: string;
  eligibility: { verified: boolean; withinQuota: boolean; paid: boolean };
  quantities: { inputId: string; qtyKg: number; acceptedQtyKg?: number }[];
}

export interface RequisitionDetailResponse extends RequisitionResponse {
  farmers: { items: FarmerEligibility[]; nextCursor?: string };
}

export function toRequisitionResponse(doc: {
  id?: string;
  _id?: Types.ObjectId;
  requisitionNo: string;
  localCenterId: Types.ObjectId | string;
  distributorId: Types.ObjectId | string;
  seasonId: Types.ObjectId | string;
  inputCategory: InputCategory;
  lines: Array<{
    inputId: Types.ObjectId | string;
    requestedKg: number;
    acceptedKg: number;
    paidKg: number;
    shippedKg: number;
    receivedKg: number;
  }>;
  requestCount: number;
  status: RequisitionStatus;
  processing?: { step: ProcessingStep; processed: number; total: number; status: ProcessingState };
  responseReason?: string;
  createdAt?: Date;
}): RequisitionResponse {
  return {
    id: doc.id ?? String(doc._id),
    requisitionNo: doc.requisitionNo,
    localCenterId: String(doc.localCenterId),
    distributorId: String(doc.distributorId),
    seasonId: String(doc.seasonId),
    inputCategory: doc.inputCategory,
    lines: doc.lines.map((line) => ({
      inputId: String(line.inputId),
      requestedKg: line.requestedKg,
      acceptedKg: line.acceptedKg,
      paidKg: line.paidKg,
      shippedKg: line.shippedKg,
      receivedKg: line.receivedKg,
    })),
    requestCount: doc.requestCount,
    status: doc.status,
    processing: doc.processing
      ? {
          step: doc.processing.step,
          processed: doc.processing.processed,
          total: doc.processing.total,
          status: doc.processing.status,
        }
      : undefined,
    responseReason: doc.responseReason,
    createdAt: doc.createdAt,
  };
}
