export function normalizeEthiopianPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  let national: string;

  if (digits.startsWith('+251')) national = digits.slice(4);
  else if (digits.startsWith('251')) national = digits.slice(3);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;

  return /^[79]\d{8}$/.test(national) ? `+251${national}` : null;
}