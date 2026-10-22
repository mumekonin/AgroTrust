import {
  allocateSupply,
  compareSmallestLand,
  decisionFor,
  formatBirr,
  lineError,
  paymentReference,
} from './supply.js';

describe('requisition supply', () => {
  it('fills earlier requests first and waitlists the rest', () => {
    const decisions = allocateSupply(
      [
        { id: 'first', items: [{ inputId: 'urea', qtyKg: 60 }] },
        { id: 'second', items: [{ inputId: 'urea', qtyKg: 50 }] },
        { id: 'third', items: [{ inputId: 'urea', qtyKg: 20 }] },
      ],
      new Map([['urea', 80]]),
    );
    expect(decisions[0]).toMatchObject({ covered: true, accepted: [{ acceptedQtyKg: 60 }] });
    expect(decisions[1]).toMatchObject({ covered: true, accepted: [{ acceptedQtyKg: 20 }] });
    expect(decisions[2]?.covered).toBe(false);
  });

  it('orders smallholders ahead of earlier approvals', () => {
    const small = { id: 'b', landHoldingHa: 0.5, reviewedAt: new Date('2026-06-02') };
    const large = { id: 'a', landHoldingHa: 4, reviewedAt: new Date('2026-06-01') };
    expect(compareSmallestLand(small, large)).toBeLessThan(0);
  });

  it('rejects an accepted quantity above the request and names the decision', () => {
    expect(lineError([{ requestedKg: 10, acceptedKg: 11 }])).toBe(
      'acceptedKg cannot exceed the requested quantity',
    );
    expect(decisionFor([{ requestedKg: 10, acceptedKg: 10 }])).toBe('ACCEPTED');
    expect(decisionFor([{ requestedKg: 10, acceptedKg: 4 }])).toBe('PARTIALLY_ACCEPTED');
    expect(decisionFor([{ requestedKg: 10, acceptedKg: 0 }])).toBe('DECLINED');
  });

  it('derives a stable payment reference and formats santim as birr', () => {
    expect(paymentReference('RQ-26-000123')).toBe('PY-26-000123');
    expect(formatBirr(5000)).toBe('50.00');
    expect(formatBirr(50)).toBe('0.50');
  });
});
