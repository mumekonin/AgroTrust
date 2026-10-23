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

/** Posts to the configured aggregator. The vendor is selected in deployment, not in this code. */
export class HttpSmsGateway extends SmsGateway {
  constructor(
    private readonly options: { url: string; key: string; sender: string },
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    super();
  }

  async send(input: { to: string; body: string }): Promise<{ providerMessageId: string }> {
    const response = await this.fetchImpl(this.options.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.options.key}`,
      },
      body: JSON.stringify({ to: input.to, body: input.body, sender: this.options.sender }),
    });
    if (!response.ok) throw new Error('SMS provider rejected the message');
    const payload = (await response.json()) as { providerMessageId?: unknown };
    if (typeof payload.providerMessageId !== 'string' || payload.providerMessageId.length === 0) {
      throw new Error('SMS provider rejected the message');
    }
    return { providerMessageId: payload.providerMessageId };
  }
}
