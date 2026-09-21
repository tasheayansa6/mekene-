import { db } from '@/lib/db';
import { getSystemSettings } from '@/lib/admin/settings';

/** Default church member reference: BME-M-000001 (not for authentication). */
const DEFAULT_PREFIX = 'BME-M';

function sanitizePrefix(value: string) {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12);
  return cleaned || DEFAULT_PREFIX;
}

export async function nextMembershipNumber(): Promise<string> {
  const settings = await getSystemSettings();
  const prefix = sanitizePrefix(settings.membershipNumberPrefix || DEFAULT_PREFIX);
  const rows = await db.member.findMany({
    where: { membershipNumber: { startsWith: `${prefix}-` } },
    select: { membershipNumber: true },
  });

  let max = 0;
  for (const row of rows) {
    const part = row.membershipNumber?.split('-').pop();
    const n = part ? Number.parseInt(part, 10) : NaN;
    if (Number.isFinite(n) && n > max) max = n;
  }

  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}
