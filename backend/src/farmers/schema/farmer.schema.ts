import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const FarmerStatus = {
  UNLINKED: 'unlinked',
  PENDING_VERIFICATION: 'pending_verification',
  VERIFIED: 'verified',
  SUSPENDED: 'suspended',
} as const;

export type FarmerStatus = (typeof FarmerStatus)[keyof typeof FarmerStatus];

export const FARMER_STATUSES: FarmerStatus[] = Object.values(FarmerStatus);

export const SHARED_PHONE_LIMIT = 5;

@Schema({ _id: false })
export class FarmerGeo {
  @Prop({ type: Types.ObjectId, required: true })
  regionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  zoneId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  woredaId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  kebeleId: Types.ObjectId;
}
export const FarmerGeoSchema = SchemaFactory.createForClass(FarmerGeo);

@Schema({ _id: false })
export class FarmerContact {
  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: Boolean, default: false })
  phoneVerified: boolean;

  @Prop({ type: Boolean, default: true })
  smsEnabled: boolean;

  @Prop({ type: Boolean, default: false })
  sharedPhone: boolean;
}
export const FarmerContactSchema = SchemaFactory.createForClass(FarmerContact);

@Schema({ collection: 'farmers', timestamps: true })
export class Farmer {
  @Prop({ type: String, required: true, trim: true })
  registryId: string;

  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: FarmerGeoSchema, required: true })
  geo: FarmerGeo;

  @Prop({ type: Types.ObjectId, required: true })
  localCenterId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  landHoldingHa: number;

  @Prop({ type: [String], default: [] })
  crops: string[];

  @Prop({ type: FarmerContactSchema, required: true })
  contact: FarmerContact;

  @Prop({ type: String })
  idRefHash?: string;

  @Prop({ type: String, enum: FARMER_STATUSES, default: FarmerStatus.UNLINKED })
  status: FarmerStatus;

  @Prop({ type: Types.ObjectId })
  verifiedBy?: Types.ObjectId;

  @Prop({ type: Date })
  verifiedAt?: Date;
}

export type FarmerDocument = HydratedDocument<Farmer>;
export const FarmerSchema = SchemaFactory.createForClass(Farmer);

FarmerSchema.index({ registryId: 1 }, { unique: true });
FarmerSchema.index({ userId: 1 }, { unique: true, sparse: true });
FarmerSchema.index({ idRefHash: 1 }, { unique: true, sparse: true });
FarmerSchema.index({ localCenterId: 1, status: 1 });
FarmerSchema.index({ 'geo.kebeleId': 1 });
FarmerSchema.index({ 'contact.phone': 1 });

/** A kebele's path is region, zone, then woreda. */
export function geoChainMatches(
  kebele: { type: string; path: string[] },
  geo: { regionId: string; zoneId: string; woredaId: string },
): boolean {
  return (
    kebele.type === 'kebele' &&
    kebele.path.length === 3 &&
    kebele.path[0] === geo.regionId &&
    kebele.path[1] === geo.zoneId &&
    kebele.path[2] === geo.woredaId
  );
}

/** Shared phones may belong to at most five farmers. A private phone belongs to one. */
export function phoneShareError(
  existing: { sharedPhone: boolean }[],
  sharedPhone: boolean,
): string | null {
  if (existing.length === 0) return null;
  if (!sharedPhone || existing.some((row) => !row.sharedPhone)) {
    return 'This phone is already registered';
  }
  if (existing.length >= SHARED_PHONE_LIMIT) return 'This phone is already shared by 5 farmers';
  return null;
}
