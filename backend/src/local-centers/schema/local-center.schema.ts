import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const CenterStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

export type CenterStatus = (typeof CenterStatus)[keyof typeof CenterStatus];

export const CENTER_STATUSES: CenterStatus[] = Object.values(CenterStatus);

export const MAX_CENTERS_PER_ADMIN = 3;

@Schema({ _id: false })
export class CenterGeo {
  @Prop({ type: Types.ObjectId, required: true })
  regionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  zoneId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  woredaId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  kebeleId: Types.ObjectId;
}
export const CenterGeoSchema = SchemaFactory.createForClass(CenterGeo);

@Schema({ _id: false })
export class CenterLocation {
  @Prop({ type: String, enum: ['Point'], required: true })
  type: 'Point';

  @Prop({ type: [Number], required: true })
  coordinates: number[];
}
export const CenterLocationSchema = SchemaFactory.createForClass(CenterLocation);

@Schema({ collection: 'local_centers', timestamps: true })
export class LocalCenter {
  @Prop({ type: String, required: true, trim: true })
  code: string;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: CenterGeoSchema, required: true })
  geo: CenterGeo;

  @Prop({ type: CenterLocationSchema, required: true })
  location: CenterLocation;

  @Prop({ type: String, required: true, trim: true })
  address: string;

  @Prop({ type: String, required: true, trim: true })
  openingHours: string;

  @Prop({ type: [Types.ObjectId], default: [] })
  localAdminUserIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], required: true })
  servesKebeleIds: Types.ObjectId[];

  @Prop({ type: Number, min: 1 })
  capacityKg?: number;

  @Prop({ type: String, enum: CENTER_STATUSES, default: CenterStatus.ACTIVE })
  status: CenterStatus;
}

export type LocalCenterDocument = HydratedDocument<LocalCenter>;
export const LocalCenterSchema = SchemaFactory.createForClass(LocalCenter);

LocalCenterSchema.index({ code: 1 }, { unique: true });
LocalCenterSchema.index({ location: '2dsphere' });
LocalCenterSchema.index({ 'geo.regionId': 1, status: 1 });

export function centerGeoMatches(
  kebele: { type: string; path: string[] },
  geo: { regionId: string; zoneId: string; woredaId: string },
): boolean {
  return (
    kebele.type === 'kebele' &&
    kebele.path[0] === geo.regionId &&
    kebele.path[1] === geo.zoneId &&
    kebele.path[2] === geo.woredaId
  );
}

export function kebeleInRegion(unit: { type: string; path: string[] }, regionId: string): boolean {
  return unit.type === 'kebele' && unit.path[0] === regionId;
}

/** A local admin may cover at most three centers. */
export function canAssignCenter(currentCenterIds: string[], centerId?: string): boolean {
  if (centerId && currentCenterIds.includes(centerId)) return true;
  return currentCenterIds.length < MAX_CENTERS_PER_ADMIN;
}
