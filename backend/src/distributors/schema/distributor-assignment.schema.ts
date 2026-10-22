import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { INPUT_CATEGORIES, type InputCategory } from '../../catalog/schema/input.schema.js';

@Schema({ collection: 'distributor_assignments', timestamps: true })
export class DistributorAssignment {
  @Prop({ type: Types.ObjectId, required: true })
  seasonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  localCenterId: Types.ObjectId;

  @Prop({ type: String, enum: INPUT_CATEGORIES, required: true })
  inputCategory: InputCategory;

  @Prop({ type: Types.ObjectId, required: true })
  distributorId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  priority: number;

  @Prop({ type: Types.ObjectId, required: true })
  setBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;
}

export type DistributorAssignmentDocument = HydratedDocument<DistributorAssignment>;
export const DistributorAssignmentSchema = SchemaFactory.createForClass(DistributorAssignment);

DistributorAssignmentSchema.index(
  { seasonId: 1, localCenterId: 1, inputCategory: 1, distributorId: 1 },
  { unique: true },
);
