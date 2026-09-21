import { db } from '@/lib/db';

const DEFAULT_CURRENCIES = ['ETB'] as const;

export function parseCurrencyList(raw?: string | null): string[] {
  if (!raw?.trim()) return [...DEFAULT_CURRENCIES];
  const list = raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return list.length ? Array.from(new Set(list)) : [...DEFAULT_CURRENCIES];
}

export function formatCurrencyList(currencies: string[]): string {
  return Array.from(new Set(currencies.map((c) => c.trim().toUpperCase()).filter(Boolean))).join(
    ','
  );
}

export function isSupportedCurrency(
  currency: string,
  supported: string[] | string
): boolean {
  const list = Array.isArray(supported) ? supported : parseCurrencyList(supported);
  return list.includes(currency.trim().toUpperCase());
}

export function parsePresetAmounts(raw?: string | null): string[] {
  if (!raw?.trim()) return ['100', '250', '500', '1000'];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ['100', '250', '500', '1000'];
    return parsed
      .map((item) => String(item).trim())
      .filter((item) => /^\d+(\.\d{1,2})?$/.test(item));
  } catch {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => /^\d+(\.\d{1,2})?$/.test(item));
  }
}

export function stringifyPresetAmounts(amounts: string[]): string {
  return JSON.stringify(
    amounts.map((item) => item.trim()).filter((item) => /^\d+(\.\d{1,2})?$/.test(item))
  );
}

export async function getGivingSettings() {
  const defaults = {
    id: 'default',
    givingYearStartMonth: 1,
    supportedCurrencies: 'ETB',
    defaultCurrency: 'ETB',
    legalChurchName: null as string | null,
    registrationInfo: null as string | null,
    donationTerms: null as string | null,
    refundPolicyNote: null as string | null,
    privacyNote: null as string | null,
    updatedAt: new Date(),
  };

  try {
    const existing = await db.churchGivingSettings.findUnique({ where: { id: 'default' } });
    if (existing) return existing;
    return await db.churchGivingSettings.create({
      data: {
        id: 'default',
        givingYearStartMonth: 1,
        supportedCurrencies: 'ETB',
        defaultCurrency: 'ETB',
      },
    });
  } catch {
    return defaults;
  }
}

/** Inclusive giving-year window for a reference date (local calendar year by start month). */
export function givingYearBounds(
  startMonth: number,
  reference: Date = new Date()
): { start: Date; end: Date; label: string } {
  const month = Math.min(12, Math.max(1, startMonth || 1));
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth() + 1;
  const startYear = m >= month ? y : y - 1;
  const start = new Date(Date.UTC(startYear, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(startYear + 1, month - 1, 1, 0, 0, 0));
  end.setUTCMilliseconds(-1);
  return {
    start,
    end,
    label: month === 1 ? `${startYear}` : `${startYear}/${startYear + 1}`,
  };
}
