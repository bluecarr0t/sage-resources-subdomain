/** Format a US phone number as `(541) 541-4122`. Returns the original string when not 10 digits. */
export function formatUsPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;

  const digits = phone.replace(/\D/g, '');
  const national =
    digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

  if (national.length !== 10) return phone.trim();

  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}
