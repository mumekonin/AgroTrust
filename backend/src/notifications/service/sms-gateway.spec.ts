import { HttpSmsGateway } from './sms-gateway.js';

describe('HttpSmsGateway', () => {
  it('sends the AgroTrust sender id and hides a rejected body', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ providerMessageId: 'p-1' }), { status: 200 }));
    const gateway = new HttpSmsGateway(
      { url: 'https://sms.example/send', key: 'secret', sender: 'AgroTrust' },
      fetchImpl,
    );

    await expect(gateway.send({ to: '+251911000000', body: 'code 1234' })).resolves.toEqual({
      providerMessageId: 'p-1',
    });
    const request = fetchImpl.mock.calls[0]?.[1] ?? {};
    expect(JSON.parse(String(request.body))).toMatchObject({ sender: 'AgroTrust', to: '+251911000000' });
    expect((request.headers as Record<string, string>).authorization).toBe('Bearer secret');

    fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'code 1234' }), { status: 502 }));
    await expect(gateway.send({ to: '+251911000000', body: 'code 1234' })).rejects.toThrow(
      'SMS provider rejected the message',
    );
  });
});
