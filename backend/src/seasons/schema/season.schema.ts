import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const SeasonStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  CLOSED: 'closed',
} as const;

export type SeasonStatus = (typeof SeasonStatus)[keyof typeof SeasonStatus];

export const SEASON_STATUSES: SeasonStatus[] = Object.values(SeasonStatus);

export const PriorityPolicy = {
  FCFS: 'FCFS',
  SMALLEST_LAND_FIRST: 'SMALLEST_LAND_FIRST',
} as const;

export type PriorityPolicy = (typeof PriorityPolicy)[keyof typeof PriorityPolicy];

export const PRIORITY_POLICIES: PriorityPolicy[] = Object.values(PriorityPolicy);

export interface SeasonWindow {
  startsAt: Date;
  endsAt: Date;
  requestsOpenAt: Date;
  requestsCloseAt: Date;
  requisitionCutoffAt: Date;
}

/** Request window and requisition cutoff must sit inside the season. */
export function seasonWindowError(window: SeasonWindow): string | null {
  const start = window.startsAt.getTime();
  const end = window.endsAt.getTime();
  const open = window.requestsOpenAt.getTime();
  const close = window.requestsCloseAt.getTime();
  const cutoff = window.requisitionCutoffAt.getTime();
  if (!(start < end)) return 'The season must end after it starts';
  if (!(start <= open && open < close && close <= end)) {
    return 'The request window must sit inside the season';
  }
  if (!(close <= cutoff && cutoff <= end)) {
    return 'The requisition cutoff must sit after requests close and inside the season';
  }
  return null;
}

@Schema({ collection: 'seasons', timestamps: true })
export class Season {
  @Prop({ type: String, required: true, trim: true })
  code: string;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, required: true })
  endsAt: Date;

  @Prop({ type: Date, required: true })
  requestsOpenAt: Date;

  @Prop({ type: Date, required: true })
  requestsCloseAt: Date;

  @Prop({ type: Date, required: true })
  requisitionCutoffAt: Date;

  @Prop({ type: Number, required: true, min: 1 })
  paymentWindowDays: number;

  @Prop({ type: Number, required: true, min: 1 })
  pickupWindowDays: number;

  @Prop({ type: String, enum: PRIORITY_POLICIES, default: PriorityPolicy.FCFS })
  priorityPolicy: PriorityPolicy;

  @Prop({ type: String, enum: SEASON_STATUSES, default: SeasonStatus.DRAFT })
  status: SeasonStatus;
}

export type SeasonDocument = HydratedDocument<Season>;
export const SeasonSchema = SchemaFactory.createForClass(Season);

SeasonSchema.index({ code: 1 }, { unique: true });
