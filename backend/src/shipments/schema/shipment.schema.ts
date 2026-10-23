import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const ShipmentStatus = {
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  RECEIVED_WITH_DISCREPANCY: 'RECEIVED_WITH_DISCREPANCY',
  CANCELLED: 'CANCELLED',
} as const;

export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const SHIPMENT_STATUSES: ShipmentStatus[] = Object.values(ShipmentStatus);

export const ShipmentStep = {
  ALLOCATE: 'allocate',
  TRANSIT: 'transit',
  EARMARK: 'earmark',
} as const;

export type ShipmentStep = (typeof ShipmentStep)[keyof typeof ShipmentStep];

export const ShipmentProcessingState = {
  RUNNING: 'running',
  DONE: 'done',
} as const;

export type ShipmentProcessingState = (typeof ShipmentProcessingState)[keyof typeof ShipmentProcessingState];

@Schema({ _id: false })
export class ShipmentLine {
  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  batchId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  qtyKg: number;
}
export const ShipmentLineSchema = SchemaFactory.createForClass(ShipmentLine);

@Schema({ _id: false })
export class ReceivedLine {
  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  batchId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  qtyKg: number;
}
export const ReceivedLineSchema = SchemaFactory.createForClass(ReceivedLine);

@Schema({ _id: false })
export class ShipmentTransport {
  @Prop({ type: String, required: true })
  vehiclePlate: string;

  @Prop({ type: String, required: true })
  driverName: string;

  @Prop({ type: String, required: true })
  driverPhone: string;
}
export const ShipmentTransportSchema = SchemaFactory.createForClass(ShipmentTransport);

@Schema({ _id: false })
export class ShipmentProcessing {
  @Prop({ type: String, enum: Object.values(ShipmentStep), required: true })
  step: ShipmentStep;

  @Prop({ type: Number, required: true, default: 0 })
  processed: number;

  @Prop({ type: String, enum: Object.values(ShipmentProcessingState), required: true })
  status: ShipmentProcessingState;

  @Prop({ type: Date, required: true })
  startedAt: Date;
}
export const ShipmentProcessingSchema = SchemaFactory.createForClass(ShipmentProcessing);

@Schema({ _id: false })
export class ShipmentDiscrepancy {
  @Prop({ type: String })
  note?: string;

  @Prop({ type: Types.ObjectId })
  resolvedBy?: Types.ObjectId;

  @Prop({ type: String })
  resolution?: string;
}
export const ShipmentDiscrepancySchema = SchemaFactory.createForClass(ShipmentDiscrepancy);

@Schema({ collection: 'shipments', timestamps: true })
export class Shipment {
  @Prop({ type: String, required: true, trim: true })
  shipmentNo: string;

  @Prop({ type: Types.ObjectId, required: true })
  requisitionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  distributorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  localCenterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: [ShipmentLineSchema], required: true })
  lines: ShipmentLine[];

  @Prop({ type: Date, required: true })
  dispatchedAt: Date;

  @Prop({ type: Date, required: true })
  etaAt: Date;

  @Prop({ type: ShipmentTransportSchema, required: true })
  transport: ShipmentTransport;

  @Prop({ type: String, enum: SHIPMENT_STATUSES, required: true })
  status: ShipmentStatus;

  @Prop({ type: Types.ObjectId })
  receivedBy?: Types.ObjectId;

  @Prop({ type: Date })
  receivedAt?: Date;

  @Prop({ type: [ReceivedLineSchema], default: [] })
  receivedLines: ReceivedLine[];

  @Prop({ type: ShipmentDiscrepancySchema })
  discrepancy?: ShipmentDiscrepancy;

  @Prop({ type: ShipmentProcessingSchema })
  processing?: ShipmentProcessing;

  @Prop({ type: String, required: true })
  idempotencyKey: string;

  createdAt?: Date;
}

export type ShipmentDocument = HydratedDocument<Shipment>;
export const ShipmentSchema = SchemaFactory.createForClass(Shipment);

ShipmentSchema.index({ shipmentNo: 1 }, { unique: true });
ShipmentSchema.index({ distributorId: 1, idempotencyKey: 1 }, { unique: true });
ShipmentSchema.index({ requisitionId: 1 });
ShipmentSchema.index({ localCenterId: 1, status: 1 });
ShipmentSchema.index({ distributorId: 1, status: 1 });
ShipmentSchema.index({ status: 1, etaAt: 1 });
ShipmentSchema.index({ 'processing.status': 1 });

@Schema({ collection: 'shipment_counters' })
export class ShipmentCounter {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: true, default: 0 })
  seq: number;
}

export type ShipmentCounterDocument = HydratedDocument<ShipmentCounter>;
export const ShipmentCounterSchema = SchemaFactory.createForClass(ShipmentCounter);
ShipmentCounterSchema.index({ key: 1 }, { unique: true });
