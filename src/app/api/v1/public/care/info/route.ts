import { success } from '@/lib/api/response';
import { db } from '@/lib/db';
import { churchConfig } from '@/config/church';

/** Public care info — no case data, no invented emergency numbers. */
export async function GET() {
  const categories = await db.pastoralCareCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, description: true },
  });

  return success({
    churchName: churchConfig.branding.name,
    contactEmail: churchConfig.contact.email,
    contactPhone: churchConfig.contact.phone,
    disclaimer:
      'Pastoral care and counseling at our church offer spiritual support and prayer. They do not replace professional medical, psychiatric, legal, or emergency services. In an urgent safety situation, contact your local emergency services.',
    categories,
    links: {
      requestCare: '/care/request',
      prayer: '/prayer',
      memberCare: '/member/care',
    },
  });
}
