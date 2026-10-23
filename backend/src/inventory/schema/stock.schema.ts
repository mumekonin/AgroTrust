import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'stock' })
export class Stock {
  @Prop({ type: Types.ObjectId, required: true })
  localCenterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  onHandKg: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  reservedKg: number;
}

export type StockDocument = HydratedDocument<Stock>;
export const StockSchema = SchemaFactory.createForClass(Stock);

StockSchema.index({ localCenterId: 1, inputId: 1, seasonId: 1 }, { unique: true });

export const StockMovementType = {
  RECEIPT: 'receipt',
  RESERVATION: 'reservation',
  RELEASE: 'release',
  ISSUE: 'issue',
  RETURN_TO_DISTRIBUTOR: 'return_to_distributor',
  ADJUSTMENT: 'adjustment',
} as const;

export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

@Schema({ collection: 'stock_movements' })
export class StockMovement {
  @Prop({ type: String, enum: Object.values(StockMovementType), required: true })
  type: StockMovementType;

  @Prop({ type: Types.ObjectId, required: true })
  localCenterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  qtyKg: number;

  @Prop({ type: Types.ObjectId })
  batchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  shipmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  requestId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  actorId?: Types.ObjectId;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: Date, required: true })
  at: Date;
}

export type StockMovementDocument = HydratedDocument<StockMovement>;
export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

StockMovementSchema.index({ localCenterId: 1, inputId: 1, seasonId: 1, at: -1 });
StockMovementSchema.index({ requestId: 1 });
StockMovementSchema.index({ shipmentId: 1 });
StockMovementSchema.index({ batchId: 1 });

for (const hook of [
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
] as const) {
  StockMovementSchema.pre(hook, () => {
    throw new Error('stock_movements are insert-only');
  });
}
