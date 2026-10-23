import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from '@prometheus-io/client';
import { NotificationsService } from '../notifications/service/notifications.service.js';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  private readonly requests: Counter<'method' | 'route' | 'status'>;
  private readonly duration: Histogram<'method' | 'route' | 'status'>;
  private readonly outboxQueued: Gauge;
  private readonly outboxAge: Gauge;

  constructor(private readonly notifications: NotificationsService) {
    this.registry.setDefaultLabels({ service: 'agrotrust-api' });
    collectDefaultMetrics({ register: this.registry });
    this.requests = new Counter({
      name: 'http_requests_total',
      help: 'HTTP requests',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [this.registry],
    });
    this.duration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'] as const,
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
    this.outboxQueued = new Gauge({
      name: 'sms_outbox_queued',
      help: 'SMS messages waiting to be sent',
      registers: [this.registry],
    });
    this.outboxAge = new Gauge({
      name: 'sms_outbox_oldest_age_seconds',
      help: 'Age of the oldest queued SMS message',
      registers: [this.registry],
    });
  }

  record(method: string, route: string, status: number, seconds: number): void {
    const labels = { method, route, status: String(status) };
    this.requests.inc(labels);
    this.duration.observe(labels, seconds);
  }

  async scrape(): Promise<string> {
    const depth = await this.notifications.outboxDepth();
    this.outboxQueued.set(depth.queued);
    this.outboxAge.set(depth.oldestAgeSeconds);
    return this.registry.metrics();
  }
}

export function httpRoute(req: { baseUrl?: string; route?: { path?: string } }): string {
  if (!req.route?.path) return 'unmatched';
  return `${req.baseUrl ?? ''}${req.route.path}`;
}
