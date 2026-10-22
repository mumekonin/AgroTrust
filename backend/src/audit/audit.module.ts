import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditCounter, AuditCounterSchema, AuditLog, AuditLogSchema } from './schema/audit-log.schema.js';
import { AuditService } from './service/audit.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: AuditCounter.name, schema: AuditCounterSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
