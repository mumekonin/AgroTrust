import type { Types } from 'mongoose';
import type { ShipmentStatus } from '../schema/shipment.schema.js';

export interface BatchResponse {
  id: string;
  lotNumber: string;
  distributorId: string;
  inputId: string;
  seasonId: string;
  quantityKg: number;
  dispatchedKg: number;
  source: string;
  importRef?: string;
  documents: string[];
}

export interface ShipmentLineResponse {
  inputId: string;
  batchId: string;
  qtyKg: number;
}

export interface ShipmentResponse {
  id: string;
  shipmentNo: string;
  requisitionId: string;
  distributorId: string;
  localCenterId: string;
  seasonId: string;
  lines: ShipmentLineResponse[];
  dispatchedAt: Date;
  etaAt: Date;
  transport: { vehiclePlate: string; driverName: string; driverPhone: string };
  status: ShipmentStatus;
  receivedAt?: Date;
  receivedLines: ShipmentLineResponse[];
  discrepancy?: { note?: string; resolution?: string };
  processing?: { step: string; processed: number; status: string };
}

export interface ShipmentListResponse {
  items: ShipmentResponse[];
  nextCursor?: string;
}

export function toBatchResponse(doc: {
  id?: string;
  _id?: Types.ObjectId;
  lotNumber: string;
  distributorId: Types.ObjectId | string;
  inputId: Types.ObjectId | string;
  seasonId: Types.ObjectId | string;
  quantityKg: number;
  dispatchedKg: number;
  source: string;
  importRef?: string;
  documents?: string[];
}): BatchResponse {
  return {
    id: doc.id ?? String(doc._id),
    lotNumber: doc.lotNumber,
    distributorId: String(doc.distributorId),
    inputId: String(doc.inputId),
    seasonId: String(doc.seasonId),
    quantityKg: doc.quantityKg,
    dispatchedKg: doc.dispatchedKg,
    source: doc.source,
    importRef: doc.importRef,
    documents: doc.documents ?? [],
  };
}

export function toShipmentResponse(doc: {
  id?: string;
  _id?: Types.ObjectId;
  shipmentNo: string;
  requisitionId: Types.ObjectId | string;
  distributorId: Types.ObjectId | string;
  localCenterId: Types.ObjectId | string;
  seasonId: Types.ObjectId | string;
  lines: { inputId: Types.ObjectId | string; batchId: Types.ObjectId | string; qtyKg: number }[];
  dispatchedAt: Date;
  etaAt: Date;
  transport: { vehiclePlate: string; driverName: string; driverPhone: string };
  status: ShipmentStatus;
  receivedAt?: Date;
  receivedLines?: { inputId: Types.ObjectId | string; batchId: Types.ObjectId | string; qtyKg: number }[];
  discrepancy?: { note?: string; resolution?: string };
  processing?: { step: string; processed: number; status: string };
}): ShipmentResponse {
  return {
    id: doc.id ?? String(doc._id),
    shipmentNo: doc.shipmentNo,
    requisitionId: String(doc.requisitionId),
    distributorId: String(doc.distributorId),
    localCenterId: String(doc.localCenterId),
    seasonId: String(doc.seasonId),
    lines: doc.lines.map(toLine),
    dispatchedAt: doc.dispatchedAt,
    etaAt: doc.etaAt,
    transport: doc.transport,
    status: doc.status,
    receivedAt: doc.receivedAt,
    receivedLines: (doc.receivedLines ?? []).map(toLine),
    discrepancy: doc.discrepancy,
    processing: doc.processing
      ? { step: doc.processing.step, processed: doc.processing.processed, status: doc.processing.status }
      : undefined,
  };
}

function toLine(line: { inputId: Types.ObjectId | string; batchId: Types.ObjectId | string; qtyKg: number }): ShipmentLineResponse {
  return { inputId: String(line.inputId), batchId: String(line.batchId), qtyKg: line.qtyKg };
}
