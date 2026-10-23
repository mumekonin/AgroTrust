import { compareLedger } from './stock.service.js';

describe('compareLedger', () => {
  it('flags a balance that does not match the movement sum', () => {
    const drifts = compareLedger(
      [{ localCenterId: 'c', inputId: 'i', seasonId: 's', onHandKg: 10 }],
      [{ localCenterId: 'c', inputId: 'i', seasonId: 's', ledgerKg: 8 }],
    );
    expect(drifts).toEqual([{ localCenterId: 'c', inputId: 'i', seasonId: 's', onHandKg: 10, ledgerKg: 8 }]);
  });
});
