import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { FraudFlag, FraudFlagStatus } from '../schema/fraud-flag.schema.js';

@Injectable()
export class FraudService {
  constructor(@InjectModel(FraudFlag.name) private readonly flags: Model<FraudFlag>) {}

  async open(
    input: {
      type: string;
      severity: string;
      localCenterId: string;
      distributorId: string;
      shipmentId: string;
      details: Record<string, unknown>;
    },
    session: ClientSession,
  ): Promise<void> {
    await this.flags.create(
      [
        {
          type: input.type,
          severity: input.severity,
          localCenterId: objectId(input.localCenterId),
          distributorId: objectId(input.distributorId),
          shipmentId: objectId(input.shipmentId),
          details: input.details,
          status: FraudFlagStatus.OPEN,
        },
      ],
      { session },
    );
  }
}

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
  return new Types.ObjectId(id);
}
