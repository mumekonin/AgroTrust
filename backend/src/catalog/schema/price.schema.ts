import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'prices', timestamps: true })
export class Price {
  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  regionId?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  unitPriceSantimPerKg: number;

  @Prop({ type: Number, required: true, min: 0 })
  subsidySantimPerKg: number;

  @Prop({ type: Date, required: true })
  effectiveFrom: Date;

  @Prop({ type: Date })
  effectiveTo?: Date;

  @Prop({ type: Types.ObjectId, required: true })
  setBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  reason: string;
}

export type PriceDocument = HydratedDocument<Price>;
export const PriceSchema = SchemaFactory.createForClass(Price);

PriceSchema.index({ inputId: 1, seasonId: 1, regionId: 1, effectiveFrom: -1 });
