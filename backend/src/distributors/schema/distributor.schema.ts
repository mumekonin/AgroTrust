import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const DistributorType = {
  GOVERNMENT: 'government',
  PRIVATE: 'private',
} as const;

export type DistributorType = (typeof DistributorType)[keyof typeof DistributorType];

export const DISTRIBUTOR_TYPES: DistributorType[] = Object.values(DistributorType);

export const DistributorStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

export type DistributorStatus = (typeof DistributorStatus)[keyof typeof DistributorStatus];

export const DISTRIBUTOR_STATUSES: DistributorStatus[] = Object.values(DistributorStatus);

@Schema({ _id: false })
export class DistributorContact {
  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String, trim: true, lowercase: true })
  email?: string;
}
export const DistributorContactSchema = SchemaFactory.createForClass(DistributorContact);

@Schema({ collection: 'distributors', timestamps: true })
export class Distributor {
  @Prop({ type: String, required: true, trim: true })
  code: string;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: DISTRIBUTOR_TYPES, required: true })
  type: DistributorType;

  @Prop({ type: String, required: true, trim: true })
  licenceNo: string;

  @Prop({ type: DistributorContactSchema, required: true })
  contact: DistributorContact;

  @Prop({ type: [Types.ObjectId], required: true })
  serviceRegionIds: Types.ObjectId[];

  @Prop({ type: String, trim: true })
  bankAccountRef?: string;

  @Prop({ type: String, enum: DISTRIBUTOR_STATUSES, default: DistributorStatus.ACTIVE })
  status: DistributorStatus;
}

export type DistributorDocument = HydratedDocument<Distributor>;
export const DistributorSchema = SchemaFactory.createForClass(Distributor);

DistributorSchema.index({ code: 1 }, { unique: true });
DistributorSchema.index({ serviceRegionIds: 1 });

export function servesRegion(serviceRegionIds: string[], regionId: string): boolean {
  return serviceRegionIds.includes(regionId);
}
