import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { getSystemSettings } from '@/lib/admin/settings';

const FAMILY_PREFIX = 'BME-F';

function sanitizePrefix(value: string, fallback: string) {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12);
  return cleaned || fallback;
}

export async function nextFamilyReference(): Promise<string> {
  const settings = await getSystemSettings();
  const raw = (settings as { familyNumberPrefix?: string }).familyNumberPrefix || FAMILY_PREFIX;
  const prefix = sanitizePrefix(raw, FAMILY_PREFIX);
  const rows = await db.household.findMany({
    where: { familyReference: { startsWith: `${prefix}-` } },
    select: { familyReference: true },
  });
  let max = 0;
  for (const row of rows) {
    const part = row.familyReference?.split('-').pop();
    const n = part ? Number.parseInt(part, 10) : NaN;
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

export function hashMemberCardToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateMemberCardToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, tokenHash: hashMemberCardToken(token) };
}
