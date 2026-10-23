import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { Stock, StockMovement, StockMovementType } from '../schema/stock.schema.js';

export interface StockRow {
  localCenterId: string;
  inputId: string;
  seasonId: string;
  onHandKg: number;
  reservedKg: number;
  availableKg: number;
}

@Injectable()
export class StockService {
  constructor(
    @InjectModel(Stock.name) private readonly stock: Model<Stock>,
    @InjectModel(StockMovement.name) private readonly movements: Model<StockMovement>,
  ) {}

  async receive(
    input: {
      localCenterId: string;
      inputId: string;
      seasonId: string;
      qtyKg: number;
      batchId?: string;
      shipmentId: string;
      actorId?: string;
      note?: string;
    },
    session: ClientSession,
  ): Promise<void> {
    if (input.qtyKg <= 0) return;
    await this.stock
      .updateOne(
        {
          localCenterId: objectId(input.localCenterId, 'Invalid center'),
          inputId: objectId(input.inputId, 'Invalid input'),
          seasonId: objectId(input.seasonId, 'Invalid season'),
        },
        { $inc: { onHandKg: input.qtyKg }, $setOnInsert: { reservedKg: 0 } },
        { upsert: true, session },
      )
      .exec();
    await this.append(StockMovementType.RECEIPT, input, session);
  }

  /** Reserved stock cannot pass what is on hand. */
  async reserve(
    input: {
      localCenterId: string;
      inputId: string;
      seasonId: string;
      qtyKg: number;
      shipmentId: string;
      requestId: string;
      actorId?: string;
    },
    session: ClientSession,
  ): Promise<void> {
    if (input.qtyKg <= 0) return;
    const result = await this.stock
      .updateOne(
        {
          localCenterId: objectId(input.localCenterId, 'Invalid center'),
          inputId: objectId(input.inputId, 'Invalid input'),
          seasonId: objectId(input.seasonId, 'Invalid season'),
          $expr: { $lte: [{ $add: ['$reservedKg', input.qtyKg] }, '$onHandKg'] },
        },
        { $inc: { reservedKg: input.qtyKg } },
        { session },
      )
      .exec();
    if (result.matchedCount !== 1) {
      throw new AppException(ErrorCode.INSUFFICIENT_STOCK, 'There is not enough stock to earmark', 409);
    }
    await this.append(StockMovementType.RESERVATION, input, session);
  }

  async listForCenters(centerIds: string[]): Promise<StockRow[]> {
    if (centerIds.length === 0) return [];
    const docs = await this.stock
      .find({ localCenterId: { $in: centerIds.map((id) => objectId(id, 'Invalid center')) } })
      .sort({ _id: 1 })
      .lean()
      .exec();
    return docs.map((doc) => ({
      localCenterId: String(doc.localCenterId),
      inputId: String(doc.inputId),
      seasonId: String(doc.seasonId),
      onHandKg: doc.onHandKg,
      reservedKg: doc.reservedKg,
      availableKg: doc.onHandKg - doc.reservedKg,
    }));
  }

  private async append(
    type: StockMovementType,
    input: {
      localCenterId: string;
      inputId: string;
      seasonId: string;
      qtyKg: number;
      batchId?: string;
      shipmentId: string;
      requestId?: string;
      actorId?: string;
      note?: string;
    },
    session: ClientSession,
  ): Promise<void> {
    await this.movements.create(
      [
        {
          type,
          localCenterId: objectId(input.localCenterId, 'Invalid center'),
          inputId: objectId(input.inputId, 'Invalid input'),
          seasonId: objectId(input.seasonId, 'Invalid season'),
          qtyKg: input.qtyKg,
          batchId: input.batchId ? objectId(input.batchId, 'Invalid batch') : undefined,
          shipmentId: objectId(input.shipmentId, 'Invalid shipment'),
          requestId: input.requestId ? objectId(input.requestId, 'Invalid request') : undefined,
          actorId: input.actorId && Types.ObjectId.isValid(input.actorId) ? new Types.ObjectId(input.actorId) : undefined,
          note: input.note,
          at: new Date(),
        },
      ],
      { session },
    );
  }
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}
