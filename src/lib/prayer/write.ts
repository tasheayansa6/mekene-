import { db } from '@/lib/db';
import { sanitizeMarkdown, sanitizePlainText } from '@/lib/content/sanitize';
import type { PrayerVisibilityValue } from './status';

export async function createPrayerRequest(input: {
  title: string;
  content: string;
  categoryId?: string | null;
  isAnonymous: boolean;
  visibility: PrayerVisibilityValue;
  userId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
}) {
  let categoryId: string | null = null;
  if (input.categoryId) {
    const category = await db.prayerCategory.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    categoryId = category?.id ?? null;
  }

  const anonymous = input.isAnonymous === true;
  const guestName = anonymous || input.userId ? null : sanitizePlainText(input.guestName || '', 80) || null;
  const guestEmail = anonymous || input.userId ? null : input.guestEmail?.trim().toLowerCase() || null;

  return db.prayerRequest.create({
    data: {
      title: sanitizePlainText(input.title, 180),
      content: sanitizeMarkdown(input.content, 8000),
      categoryId,
      isAnonymous: anonymous,
      visibility: input.visibility === 'public' ? 'public' : 'private',
      status: 'new',
      publicApproved: false,
      userId: input.userId ?? null,
      guestName,
      guestEmail,
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
}
