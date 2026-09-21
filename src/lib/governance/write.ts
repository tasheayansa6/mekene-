import { db } from '@/lib/db';
import { DEFAULT_RESOLUTION_NUMBER_FORMAT } from './status';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'item';
}

export async function uniqueCommitteeSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (await db.committee.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

export async function uniquePolicySlug(base: string): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (await db.governancePolicy.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

export async function nextResolutionNumber(format = DEFAULT_RESOLUTION_NUMBER_FORMAT): Promise<string> {
  const year = new Date().getFullYear();
  if (format === 'YEAR-NUMBER') {
    const prefix = `${year}-`;
    const latest = await db.resolution.findFirst({
      where: { resolutionNumber: { startsWith: prefix } },
      orderBy: { resolutionNumber: 'desc' },
    });
    let next = 1;
    if (latest) {
      const part = latest.resolutionNumber.split('-')[1];
      const parsed = Number.parseInt(part ?? '0', 10);
      if (!Number.isNaN(parsed)) next = parsed + 1;
    }
    return `${year}-${String(next).padStart(3, '0')}`;
  }
  // Fallback: timestamp-based unique
  return `${year}-${Date.now().toString(36).toUpperCase()}`;
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await db.governanceSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.governanceSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Term end date from start + configurable months (null = indefinite). */
export function computeTermEnd(startAt: Date, termMonths: number | null | undefined): Date | null {
  if (termMonths == null || termMonths <= 0) return null;
  const end = new Date(startAt);
  end.setMonth(end.getMonth() + termMonths);
  return end;
}

export function appointmentsExpiringWithin(
  endAt: Date | null | undefined,
  now: Date,
  days: number
): boolean {
  if (!endAt) return false;
  const ms = days * 24 * 60 * 60 * 1000;
  const diff = endAt.getTime() - now.getTime();
  return diff >= 0 && diff <= ms;
}
