import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { InputRequest, RequestStatus } from '../schema/input-request.schema.js';

export interface RequestMetricLine {
  localCenterId: string;
  seasonId: string;
  inputId: string;
  requestedKg: number;
  acceptedKg: number;
  paidKg: number;
  handedOverKg: number;
  requestCount: number;
  cycleDays: number;
  completedCount: number;
}

const PAID = [RequestStatus.PAID, RequestStatus.IN_TRANSIT, RequestStatus.READY_FOR_PICKUP, RequestStatus.COMPLETED];

@Injectable()
export class RequestMetricsService {
  constructor(@InjectModel(InputRequest.name) private readonly requests: Model<InputRequest>) {}

  async lines(): Promise<RequestMetricLine[]> {
    const grouped = await this.requests
      .aggregate<{
        _id: { localCenterId: Types.ObjectId; seasonId: Types.ObjectId; inputId: Types.ObjectId };
        requestedKg: number;
        acceptedKg: number;
        paidKg: number;
        handedOverKg: number;
        requestIds: Types.ObjectId[];
        cycleDays: number;
        completedCount: number;
      }>([
        { $match: { status: { $ne: RequestStatus.CANCELLED } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: { localCenterId: '$localCenterId', seasonId: '$seasonId', inputId: '$items.inputId' },
            requestedKg: { $sum: '$items.qtyKg' },
            acceptedKg: { $sum: { $ifNull: ['$items.acceptedQtyKg', 0] } },
            paidKg: {
              $sum: {
                $cond: [{ $in: ['$status', PAID] }, { $ifNull: ['$items.acceptedQtyKg', 0] }, 0],
              },
            },
            handedOverKg: {
              $sum: {
                $cond: [
                  { $eq: ['$status', RequestStatus.COMPLETED] },
                  {
                    $cond: [
                      { $gt: [{ $ifNull: ['$items.acceptedQtyKg', 0] }, 0] },
                      '$items.acceptedQtyKg',
                      '$items.qtyKg',
                    ],
                  },
                  0,
                ],
              },
            },
            requestIds: { $addToSet: '$_id' },
            cycleDays: {
              $sum: {
                $cond: [
                  { $eq: ['$status', RequestStatus.COMPLETED] },
                  {
                    $divide: [
                      {
                        $subtract: [
                          {
                            $ifNull: [
                              {
                                $max: {
                                  $map: {
                                    input: {
                                      $filter: {
                                        input: '$statusHistory',
                                        as: 'entry',
                                        cond: { $eq: ['$$entry.status', RequestStatus.COMPLETED] },
                                      },
                                    },
                                    as: 'done',
                                    in: '$$done.at',
                                  },
                                },
                              },
                              '$createdAt',
                            ],
                          },
                          '$createdAt',
                        ],
                      },
                      86_400_000,
                    ],
                  },
                  0,
                ],
              },
            },
            completedCount: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.COMPLETED] }, 1, 0] } },
          },
        },
      ])
      .exec();
    return grouped.map((row) => ({
      localCenterId: String(row._id.localCenterId),
      seasonId: String(row._id.seasonId),
      inputId: String(row._id.inputId),
      requestedKg: row.requestedKg,
      acceptedKg: row.acceptedKg,
      paidKg: row.paidKg,
      handedOverKg: row.handedOverKg,
      requestCount: row.requestIds.length,
      cycleDays: row.cycleDays,
      completedCount: row.completedCount,
    }));
  }
}
