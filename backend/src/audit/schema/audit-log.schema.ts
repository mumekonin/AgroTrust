import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class AuditActor {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, required: true })
  ip: string;

  @Prop({ type: String })
  userAgent?: string;
}
export const AuditActorSchema = SchemaFactory.createForClass(AuditActor);

@Schema({ _id: false })
export class AuditEntity {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  id: string;
}
export const AuditEntitySchema = SchemaFactory.createForClass(AuditEntity);

/** §2.8.3 audit_logs. Insert-only. A daily job verifies the chain. */
@Schema({ collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Number, required: true })
  seq: number;

  @Prop({ type: Date, required: true })
  at: Date;

  @Prop({ type: AuditActorSchema, required: true })
  actor: AuditActor;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: AuditEntitySchema, required: true })
  entity: AuditEntity;

  @Prop({ type: Object })
  changes?: Record<string, unknown>;

  @Prop({ type: String })
  requestId?: string;

  @Prop({ type: String })
  localCenterId?: string;

  @Prop({ type: String, required: true })
  prevHash: string;

  @Prop({ type: String, required: true })
  hash: string;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ seq: 1 }, { unique: true });
AuditLogSchema.index({ 'entity.type': 1, 'entity.id': 1, at: -1 });
AuditLogSchema.index({ 'actor.userId': 1, at: -1 });
AuditLogSchema.index({ localCenterId: 1, at: -1 });

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
  AuditLogSchema.pre(hook, () => {
    throw new Error('audit_logs are insert-only');
  });
}

@Schema({ collection: 'audit_counters' })
export class AuditCounter {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: true, default: 0 })
  seq: number;
}

export type AuditCounterDocument = HydratedDocument<AuditCounter>;
export const AuditCounterSchema = SchemaFactory.createForClass(AuditCounter);

AuditCounterSchema.index({ key: 1 }, { unique: true });

@Schema({ collection: 'audit_digests' })
export class AuditDigest {
  @Prop({ type: String, required: true })
  date: string;

  @Prop({ type: Number, required: true })
  seq: number;

  @Prop({ type: String, required: true })
  hash: string;

  @Prop({ type: String, required: true })
  signature: string;

  @Prop({ type: Boolean, required: true })
  intact: boolean;
}

export type AuditDigestDocument = HydratedDocument<AuditDigest>;
export const AuditDigestSchema = SchemaFactory.createForClass(AuditDigest);

AuditDigestSchema.index({ date: 1 }, { unique: true });
