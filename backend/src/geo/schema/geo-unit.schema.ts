import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const GeoType = {
  REGION: 'region',
  ZONE: 'zone',
  WOREDA: 'woreda',
  KEBELE: 'kebele',
} as const;

export type GeoType = (typeof GeoType)[keyof typeof GeoType];

export const GEO_TYPES: GeoType[] = Object.values(GeoType);

/** The type that must sit directly above `type`. A region has none. */
export function expectedParentType(type: GeoType): GeoType | null {
  if (type === GeoType.ZONE) return GeoType.REGION;
  if (type === GeoType.WOREDA) return GeoType.ZONE;
  if (type === GeoType.KEBELE) return GeoType.WOREDA;
  return null;
}

@Schema({ _id: false })
export class GeoName {
  @Prop({ type: String, required: true, trim: true })
  en: string;

  @Prop({ type: String, required: true, trim: true })
  am: string;

  @Prop({ type: String, required: true, trim: true })
  om: string;
}
export const GeoNameSchema = SchemaFactory.createForClass(GeoName);

@Schema({ collection: 'geo_units', timestamps: true })
export class GeoUnit {
  @Prop({ type: String, enum: GEO_TYPES, required: true })
  type: GeoType;

  @Prop({ type: String, required: true, trim: true })
  code: string;

  @Prop({ type: GeoNameSchema, required: true })
  name: GeoName;

  @Prop({ type: Types.ObjectId })
  parentId?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [] })
  path: Types.ObjectId[];
}

export type GeoUnitDocument = HydratedDocument<GeoUnit>;
export const GeoUnitSchema = SchemaFactory.createForClass(GeoUnit);

GeoUnitSchema.index({ code: 1 }, { unique: true });
GeoUnitSchema.index({ parentId: 1 });
GeoUnitSchema.index({ path: 1 });
