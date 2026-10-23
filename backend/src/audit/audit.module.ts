import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FraudModule } from '../fraud/fraud.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { AuditController } from './controller/audit.controller.js';
import {
  AuditCounter,
  AuditCounterSchema,
  AuditDigest,
  AuditDigestSchema,
  AuditLog,
  AuditLogSchema,
} from './schema/audit-log.schema.js';
import { AuditService } from './service/audit.service.js';
import { AuditWorker } from './service/audit-worker.js';

@Module({
  imports: [
    FraudModule,
    LocalCentersModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: AuditCounter.name, schema: AuditCounterSchema },
      { name: AuditDigest.name, schema: AuditDigestSchema },
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditWorker],
  exports: [AuditService],
})
export class AuditModule {}
