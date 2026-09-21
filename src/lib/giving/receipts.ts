import { db } from '@/lib/db';
import { getSystemSettings } from '@/lib/admin/settings';

export async function nextReceiptNumber(): Promise<string> {
  const settings = await getSystemSettings();
  const prefix = settings.receiptPrefix || 'BME-REC';

  const result = await db.$transaction(async (tx) => {
    const row = await tx.receiptSequence.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', prefix, nextValue: 1 },
    });
    const value = row.nextValue;
    await tx.receiptSequence.update({
      where: { id: 'default' },
      data: {
        nextValue: value + 1,
        prefix,
      },
    });
    return { prefix: row.prefix || prefix, value };
  });

  return `${result.prefix}-${String(result.value).padStart(6, '0')}`;
}

export function buildReference(prefix = 'BME-GIV'): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}
