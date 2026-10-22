import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class AllocationBasis {
  @Prop({ type: Number, required: true, min: 0 })
  landHoldingHa: number;

  @Prop({ type: Number, required: true, min: 0 })
  rateKgPerHa: number;

  @Prop({ type: Number, required: true, min: 1 })
  ruleVersion: number;
}
export const AllocationBasisSchema = SchemaFactory.createForClass(AllocationBasis);

@Schema({ collection: 'allocations', timestamps: true })
export class Allocation {
  @Prop({ type: Types.ObjectId, required: true })
  farmerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  entitledKg: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  reservedKg: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  purchasedKg: number;

  @Prop({ type: AllocationBasisSchema, required: true })
  basis: AllocationBasis;
}

export type AllocationDocument = HydratedDocument<Allocation>;
export const AllocationSchema = SchemaFactory.createForClass(Allocation);

AllocationSchema.index({ farmerId: 1, seasonId: 1, inputId: 1 }, { unique: true });
