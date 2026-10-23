import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'batches', timestamps: true })
export class Batch {
  @Prop({ type: String, required: true, trim: true })
  lotNumber: string;

  @Prop({ type: Types.ObjectId, required: true })
  distributorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantityKg: number;

  /** Kilograms already placed on shipments. Stays within quantityKg. */
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  dispatchedKg: number;

  @Prop({ type: String, required: true, trim: true })
  source: string;

  @Prop({ type: String })
  importRef?: string;

  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String, required: true })
  idempotencyKey: string;

  createdAt?: Date;
}

export type BatchDocument = HydratedDocument<Batch>;
export const BatchSchema = SchemaFactory.createForClass(Batch);

BatchSchema.index({ lotNumber: 1 }, { unique: true });
BatchSchema.index({ distributorId: 1, idempotencyKey: 1 }, { unique: true });
BatchSchema.index({ distributorId: 1, inputId: 1, seasonId: 1 });
