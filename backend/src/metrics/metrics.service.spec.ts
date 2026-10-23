import { MetricsService, httpRoute } from './metrics.service.js';

describe('metrics', () => {
  it('names a matched route and leaves unknown urls unmatched', () => {
    expect(httpRoute({ baseUrl: '/api/v1', route: { path: '/health/live' } })).toBe('/api/v1/health/live');
    expect(httpRoute({})).toBe('unmatched');
  });

  it('exposes request counts and the SMS queue', async () => {
    const notifications = { outboxDepth: vi.fn().mockResolvedValue({ queued: 2, oldestAgeSeconds: 30 }) };
    const service = new MetricsService(notifications as never);
    service.record('POST', '/api/v1/input-requests', 201, 0.02);

    const text = await service.scrape();

    expect(text).toContain('route="/api/v1/input-requests"');
    expect(text).toContain('sms_outbox_queued{service="agrotrust-api"} 2');
    expect(text).toContain('sms_outbox_oldest_age_seconds{service="agrotrust-api"} 30');
  });
});
