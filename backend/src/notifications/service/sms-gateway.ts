import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export abstract class SmsGateway {
  abstract send(input: { to: string; body: string }): Promise<{ providerMessageId: string }>;
}

@Injectable()
export class MockSmsGateway extends SmsGateway {
  readonly sent: { to: string; body: string; providerMessageId: string }[] = [];

  async send(input: { to: string; body: string }): Promise<{ providerMessageId: string }> {
    const providerMessageId = `mock-${randomBytes(8).toString('hex')}`;
    this.sent.push({ to: input.to, body: input.body, providerMessageId });
    return { providerMessageId };
  }
}
