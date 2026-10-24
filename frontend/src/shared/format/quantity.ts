export function formatKg(kg: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(kg)
}

export function formatQuintal(kg: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(kg / 100)
}

export function formatBirr(santim: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(santim / 100)
}
