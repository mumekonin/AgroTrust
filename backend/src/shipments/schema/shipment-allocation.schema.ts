import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'shipment_allocations', timestamps: true })
export class ShipmentAllocation {
  @Prop({ type: Types.ObjectId, required: true })
  shipmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  requestId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  inputId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  qtyKg: number;
}

export type ShipmentAllocationDocument = HydratedDocument<ShipmentAllocation>;
export const ShipmentAllocationSchema = SchemaFactory.createForClass(ShipmentAllocation);

ShipmentAllocationSchema.index({ shipmentId: 1, requestId: 1, inputId: 1 }, { unique: true });
ShipmentAllocationSchema.index({ requestId: 1 });
ShipmentAllocationSchema.index({ shipmentId: 1, _id: 1 });
