import { Decimal } from '@prisma/client/runtime/library';

export const SUPPORTED_CURRENCIES = ['ETB'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = 'ETB';

/** Parse user/API money input into a Decimal. Rejects floats that lose precision via string path. */
export function parseMoney(value: unknown): Decimal | null {
  if (value instanceof Decimal) {
    if (!value.isFinite() || value.lte(0)) return null;
    return value.toDecimalPlaces(2);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return new Decimal(value.toFixed(2));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
    const money = new Decimal(trimmed);
    if (!money.isFinite() || money.lte(0)) return null;
    return money.toDecimalPlaces(2);
  }
  return null;
}

export function moneyToString(value: Decimal | string | number): string {
  return new Decimal(value).toFixed(2);
}

export function moneyEquals(a: Decimal | string, b: Decimal | string): boolean {
  return new Decimal(a).eq(new Decimal(b));
}

export function netContributionAmount(
  amount: Decimal | string,
  refundedAmount: Decimal | string
): Decimal {
  const net = new Decimal(amount).minus(new Decimal(refundedAmount));
  return net.lt(0) ? new Decimal(0) : net.toDecimalPlaces(2);
}

export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency);
}

export function assertCurrency(currency: string): SupportedCurrency {
  const upper = currency.trim().toUpperCase();
  if (!isSupportedCurrency(upper)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return upper;
}
