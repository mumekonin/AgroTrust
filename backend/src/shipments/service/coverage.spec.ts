import { coverRequest, linesDiffer, sumBy } from './coverage.js';

describe('shipment coverage', () => {
  it('covers a request only when every input fits', () => {
    const remaining = new Map([
      ['urea', 100],
      ['nps', 40],
    ]);
    expect(coverRequest(remaining, [{ inputId: 'urea', qtyKg: 60 }])).toEqual(new Map([
      ['urea', 40],
      ['nps', 40],
    ]));
    expect(coverRequest(remaining, [{ inputId: 'urea', qtyKg: 50 }, { inputId: 'nps', qtyKg: 50 }])).toBeNull();
  });

  it('treats a different batch quantity as a discrepancy', () => {
    const dispatched = [{ inputId: 'urea', batchId: 'lot', qtyKg: 100 }];
    expect(linesDiffer(dispatched, [{ inputId: 'urea', batchId: 'lot', qtyKg: 80 }])).toBe(true);
    expect(linesDiffer(dispatched, [{ inputId: 'urea', batchId: 'lot', qtyKg: 100 }])).toBe(false);
    expect(sumBy(dispatched, (line) => line.inputId).get('urea')).toBe(100);
  });
});
