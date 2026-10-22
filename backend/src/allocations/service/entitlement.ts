/** §2.8.3 and §4.A.5. Kilograms are integers. Fractional hectares are floored. */
export function entitledKg(input: {
  landHoldingHa: number;
  rateKgPerHa: number;
  minKg: number;
  maxHa: number;
  maxKgPerFarmer: number;
}): number {
  const hectares = Math.min(Math.max(input.landHoldingHa, 0), input.maxHa);
  const milliHa = Math.round(hectares * 1000);
  const raw = Math.floor((milliHa * input.rateKgPerHa) / 1000);
  return Math.min(input.maxKgPerFarmer, Math.max(input.minKg, raw));
}

export function ruleFieldError(rule: { minKg: number; maxKgPerFarmer: number }): string | null {
  if (rule.minKg > rule.maxKgPerFarmer) return 'minKg cannot exceed maxKgPerFarmer';
  return null;
}

/**
 * A regional rule may only narrow the approved national rule.
 * A higher floor would give smallholders more than the national entitlement.
 */
export function outsideNationalBounds(
  regional: RuleBounds,
  national: RuleBounds,
): string | null {
  if (regional.rateKgPerHa > national.rateKgPerHa) return 'rateKgPerHa exceeds the national rule';
  if (regional.maxHa > national.maxHa) return 'maxHa exceeds the national rule';
  if (regional.maxKgPerFarmer > national.maxKgPerFarmer) {
    return 'maxKgPerFarmer exceeds the national rule';
  }
  if (regional.minKg > national.minKg) return 'minKg exceeds the national rule';
  if (national.cropFilter && regional.cropFilter !== national.cropFilter) {
    return 'cropFilter must match the national rule';
  }
  return null;
}

interface RuleBounds {
  rateKgPerHa: number;
  minKg: number;
  maxHa: number;
  maxKgPerFarmer: number;
  cropFilter?: string;
}
