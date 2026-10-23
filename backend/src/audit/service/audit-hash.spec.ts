import { AUDIT_GENESIS, auditHash, linkRecord, signDigest, walkChain, type ChainLink } from './audit-hash.js';

describe('audit chain', () => {
  const actor = { userId: 'user-1', role: 'local_admin', ip: '127.0.0.1' };
  const first = {
    seq: 1,
    at: '2026-10-23T00:00:00.000Z',
    actor,
    action: 'REQUEST_APPROVED',
    entity: { type: 'input_request', id: 'request-1' },
    changes: { requestNo: 'RQ-26-000123' },
    requestId: 'req-1',
    localCenterId: 'center-1',
  };

  function link(body: Omit<ChainLink, 'prevHash' | 'hash'>, prevHash: string): ChainLink {
    return { ...body, prevHash, hash: auditHash(prevHash, linkRecord(body)) };
  }

  it('accepts a chain and rejects a changed row', () => {
    const one = link(first, AUDIT_GENESIS);
    const two = link(
      {
        seq: 2,
        at: '2026-10-23T01:00:00.000Z',
        actor,
        action: 'PICKUP_COMPLETED',
        entity: { type: 'input_request', id: 'request-1' },
        changes: { quantityKg: 10 },
        requestId: '',
      },
      one.hash,
    );
    expect(walkChain([one, two])).toMatchObject({ intact: true, seq: 2, hash: two.hash });
    expect(walkChain([one, { ...two, changes: { quantityKg: 11 } }])).toMatchObject({
      intact: false,
      brokenSeq: 2,
      hash: one.hash,
    });
  });

  it('signs the daily digest from the latest hash', () => {
    const left = signDigest('pepper', '2026-10-23', 2, 'abc');
    const right = signDigest('pepper', '2026-10-23', 2, 'abc');
    expect(left).toBe(right);
    expect(signDigest('pepper', '2026-10-23', 2, 'abd')).not.toBe(left);
  });
});
