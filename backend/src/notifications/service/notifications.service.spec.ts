import { Types } from 'mongoose';
import { ErrorCode } from '../../common/errors/error-codes.js';
import {
  NotificationEvent,
  NotificationLanguage,
  NOTIFICATION_EVENTS,
} from '../schema/notification.schema.js';
import { NotificationsService, smsSignature } from './notifications.service.js';
import { nextRetryAt, renderTemplate, templateFor } from './sms-templates.js';

const pepper = 'pepper-pepper-pepper-pepper-pepper-32';

describe('sms templates', () => {
  it('fills the template and keeps Amharic templates short', () => {
    expect(
      renderTemplate(NotificationEvent.REQUEST_APPROVED, NotificationLanguage.EN, { requestNo: 'R-1' }),
    ).toBe('Request R-1 approved.');
    for (const event of NOTIFICATION_EVENTS) {
      expect(templateFor(event, NotificationLanguage.AM).length).toBeLessThanOrEqual(70);
    }
  });

  it('stops retrying after five attempts', () => {
    const now = new Date('2026-10-22T10:00:00.000Z');
    expect(nextRetryAt(1, now)?.toISOString()).toBe('2026-10-22T10:01:00.000Z');
    expect(nextRetryAt(5, now)).toBeNull();
  });
});

describe('NotificationsService', () => {
  const notifications = { findOne: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn() };
  const farmers = { matchingIds: vi.fn() };
  const gateway = { send: vi.fn() };
  const config = { get: vi.fn().mockReturnValue(pepper) };
  const service = new NotificationsService(
    notifications as never,
    farmers as never,
    gateway as never,
    config as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    config.get.mockReturnValue(pepper);
    notifications.findOne.mockReturnValue({ session: () => ({ exec: async () => null }) });
  });

  it('keeps a farmer with no phone on the manual list', async () => {
    notifications.create.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        event: NotificationEvent.REQUEST_APPROVED,
        language: NotificationLanguage.EN,
        status: 'manual',
        params: { requestNo: 'R-1' },
        body: 'Request R-1 approved.',
        recipient: {},
      },
    ]);

    const created = await service.enqueue({
      event: NotificationEvent.REQUEST_APPROVED,
      params: { requestNo: 'R-1' },
      related: { type: 'request', id: 'R-1' },
    });

    expect(created.status).toBe('manual');
    expect(gateway.send).not.toHaveBeenCalled();
    const doc = notifications.create.mock.calls[0][0][0] as { status: string; phone?: string };
    expect(doc.status).toBe('manual');
  });

  it('sends a queued message and stores the provider id', async () => {
    const doc = queuedDoc();
    notifications.findOneAndUpdate
      .mockReturnValueOnce({ exec: async () => doc })
      .mockReturnValue({ exec: async () => null });
    gateway.send.mockResolvedValue({ providerMessageId: 'mock-1' });

    const sent = await service.dispatchDue(new Date('2026-10-22T10:00:00.000Z'));

    expect(sent).toBe(1);
    expect(doc.status).toBe('sent');
    expect(doc.providerMessageId).toBe('mock-1');
    expect(doc.body).toBe('Request R-1 approved.');
    expect(gateway.send).toHaveBeenCalledWith({
      to: '+251911000000',
      body: 'Request R-1 approved.',
    });
  });

  it('moves a message to the manual list when sending keeps failing', async () => {
    const doc = queuedDoc();
    doc.attempts = 4;
    notifications.findOneAndUpdate
      .mockReturnValueOnce({ exec: async () => doc })
      .mockReturnValue({ exec: async () => null });
    gateway.send.mockRejectedValue(new Error('gateway down'));

    await service.dispatchDue(new Date('2026-10-22T10:00:00.000Z'));

    expect(doc.status).toBe('manual');
    expect(doc.attempts).toBe(5);
  });

  it('rejects a delivery report with a bad signature and redacts a code once delivered', async () => {
    await expect(
      service.applyDeliveryReport({ providerMessageId: 'mock-1', status: 'delivered' }, 'nope'),
    ).rejects.toMatchObject({ code: ErrorCode.UNAUTHENTICATED });

    const doc = queuedDoc();
    doc.status = 'sent';
    doc.event = NotificationEvent.LOGIN_OTP;
    doc.params = { code: '123456' };
    doc.body = 'AgroTrust code 123456.';
    doc.providerMessageId = 'mock-1';
    notifications.findOne.mockReturnValue({ exec: async () => doc });

    const signature = smsSignature(pepper, 'mock-1', 'delivered');
    const updated = await service.applyDeliveryReport(
      { providerMessageId: 'mock-1', status: 'delivered' },
      signature,
    );

    expect(updated.status).toBe('delivered');
    expect(updated.body).toBe('AgroTrust code ******.');
    expect(doc.body).toBe('AgroTrust code ******.');
  });
});

function queuedDoc() {
  return {
    _id: new Types.ObjectId(),
    status: 'queued',
    attempts: 0,
    event: NotificationEvent.REQUEST_APPROVED,
    language: NotificationLanguage.EN,
    params: { requestNo: 'R-1' } as Record<string, string>,
    body: undefined as string | undefined,
    providerMessageId: undefined as string | undefined,
    failureReason: undefined as string | undefined,
    recipient: { phone: '+251911000000' },
    nextAttemptAt: undefined as Date | undefined,
    save: vi.fn().mockResolvedValue(undefined),
  };
}
