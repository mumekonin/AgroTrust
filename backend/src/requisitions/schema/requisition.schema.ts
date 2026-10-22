import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { INPUT_CATEGORIES, type InputCategory } from '../../catalog/schema/input.schema.js';

export const RequisitionStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  PARTIALLY_ACCEPTED: 'PARTIALLY_ACCEPTED',
  DECLINED: 'DECLINED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
} as const;

export type RequisitionStatus = (typeof RequisitionStatus)[keyof typeof RequisitionStatus];

export const REQUISITION_STATUSES: RequisitionStatus[] = Object.values(RequisitionStatus);

export const ProcessingStep = {
  MARK: 'mark',
  ACCEPT: 'accept',
  DECLINE: 'decline',
} as const;

export type ProcessingStep = (typeof ProcessingStep)[keyof typeof ProcessingStep];

export const ProcessingState = {
  RUNNING: 'running',
  PAUSED: 'paused',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export type ProcessingState = (typeof ProcessingState)[keyof typeof ProcessingState];

@Schema({ _id: false })
export class RequisitionLine {
  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  requestedKg: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  acceptedKg: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  paidKg: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  shippedKg: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  receivedKg: number;
}
export const RequisitionLineSchema = SchemaFactory.createForClass(RequisitionLine);

@Schema({ _id: false })
export class RequisitionProcessing {
  @Prop({ type: String, enum: Object.values(ProcessingStep), required: true })
  step: ProcessingStep;

  @Prop({ type: String })
  cursor?: string;

  @Prop({ type: Number, required: true, default: 0 })
  processed: number;

  @Prop({ type: Number, required: true, default: 0 })
  total: number;

  @Prop({ type: String, enum: Object.values(ProcessingState), required: true })
  status: ProcessingState;

  @Prop({ type: Date, required: true })
  startedAt: Date;
}
export const RequisitionProcessingSchema = SchemaFactory.createForClass(RequisitionProcessing);

@Schema({ _id: false })
export class RequisitionActor {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  role: string;
}
export const RequisitionActorSchema = SchemaFactory.createForClass(RequisitionActor);

@Schema({ _id: false })
export class RequisitionStatusChange {
  @Prop({ type: String, enum: REQUISITION_STATUSES, required: true })
  status: RequisitionStatus;

  @Prop({ type: Date, required: true })
  at: Date;

  @Prop({ type: Types.ObjectId })
  actorId?: Types.ObjectId;

  @Prop({ type: String })
  reason?: string;
}
export const RequisitionStatusChangeSchema = SchemaFactory.createForClass(RequisitionStatusChange);

@Schema({ collection: 'requisitions', timestamps: true })
export class Requisition {
  @Prop({ type: String, required: true, trim: true })
  requisitionNo: string;

  @Prop({ type: Types.ObjectId, required: true })
  localCenterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  distributorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: String, enum: INPUT_CATEGORIES, required: true })
  inputCategory: InputCategory;

  @Prop({ type: [RequisitionLineSchema], default: [] })
  lines: RequisitionLine[];

  @Prop({ type: Number, required: true, min: 0 })
  requestCount: number;

  @Prop({ type: String, enum: REQUISITION_STATUSES, required: true })
  status: RequisitionStatus;

  @Prop({ type: RequisitionProcessingSchema })
  processing?: RequisitionProcessing;

  @Prop({ type: RequisitionActorSchema })
  submittedBy?: RequisitionActor;

  @Prop({ type: Types.ObjectId })
  respondedBy?: Types.ObjectId;

  @Prop({ type: Date })
  respondedAt?: Date;

  @Prop({ type: String })
  responseReason?: string;

  @Prop({ type: [RequisitionStatusChangeSchema], default: [] })
  statusHistory: RequisitionStatusChange[];

  @Prop({ type: String, required: true })
  idempotencyKey: string;

  createdAt?: Date;
}

export type RequisitionDocument = HydratedDocument<Requisition>;
export const RequisitionSchema = SchemaFactory.createForClass(Requisition);

RequisitionSchema.index({ requisitionNo: 1 }, { unique: true });
RequisitionSchema.index({ localCenterId: 1, idempotencyKey: 1 }, { unique: true });
RequisitionSchema.index({ distributorId: 1, status: 1, createdAt: -1 });
RequisitionSchema.index({ localCenterId: 1, status: 1 });
RequisitionSchema.index({ 'processing.status': 1 });

@Schema({ collection: 'requisition_counters' })
export class RequisitionCounter {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: true, default: 0 })
  seq: number;
}

export type RequisitionCounterDocument = HydratedDocument<RequisitionCounter>;
export const RequisitionCounterSchema = SchemaFactory.createForClass(RequisitionCounter);

RequisitionCounterSchema.index({ key: 1 }, { unique: true });
