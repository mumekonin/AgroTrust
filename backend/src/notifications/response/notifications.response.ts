import type { Types } from 'mongoose';
import type {
  NotificationEvent,
  NotificationLanguage,
  NotificationStatus,
} from '../schema/notification.schema.js';
import { redactSecrets } from '../service/sms-templates.js';

export interface NotificationListResponse {
  items: NotificationResponse[];
  nextCursor?: string;
}

export interface NotificationResponse {
  id: string;
  event: NotificationEvent;
  language: NotificationLanguage;
  body?: string;
  status: NotificationStatus;
  phone?: string;
  farmerId?: string;
  failureReason?: string;
  attempts?: number;
  related?: { type: string; id: string };
  createdAt?: string;
}

type NotificationRow = {
  id?: string;
  _id?: Types.ObjectId;
  event: NotificationEvent;
  language: NotificationLanguage;
  body?: string;
  params?: Record<string, string>;
  status: NotificationStatus;
  recipient?: { phone?: string; farmerId?: Types.ObjectId | string };
  failureReason?: string;
  attempts?: number;
  related?: { type: string; id: string };
  createdAt?: Date;
};

export function toNotificationResponse(
  notification: NotificationRow,
  options?: { includeBody?: boolean; redact?: boolean },
): NotificationResponse {
  const stored = notification.body;
  const body =
    options?.includeBody === false
      ? undefined
      : options?.redact && stored
        ? redactSecrets(stored, notification.params, notification.event)
        : stored;
  return {
    id: notification.id ?? String(notification._id),
    event: notification.event,
    language: notification.language,
    body,
    status: notification.status,
    phone: notification.recipient?.phone,
    farmerId: notification.recipient?.farmerId ? String(notification.recipient.farmerId) : undefined,
    failureReason: notification.failureReason,
    attempts: notification.attempts,
    related: notification.related,
    createdAt: notification.createdAt?.toISOString(),
  };
}
