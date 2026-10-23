import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FraudFlag, FraudFlagSchema } from './schema/fraud-flag.schema.js';
import { FraudService } from './service/fraud.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: FraudFlag.name, schema: FraudFlagSchema }])],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
