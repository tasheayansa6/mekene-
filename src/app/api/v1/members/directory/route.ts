import { db } from '@/lib/db';
import { paginated } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';

/**
 * Privacy-safe directory. Public entries only include approved display fields.
 * Never returns phone, private email, address, giving, or attendance.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const q = url.searchParams.get('q')?.trim() || '';
  const { user } = await optionalAuth(request);

  const visibility = user
    ? { in: ['public', 'members_only'] as const }
    : { equals: 'public' as const };

  const where = {
    status: { in: ['active', 'approved'] as const },
    directoryVisibility: visibility,
    showDisplayName: true,
    ...(q
      ? {
          OR: [
            { displayName: { contains: q } },
            { preferredName: { contains: q } },
            { user: { firstName: { contains: q } } },
            { user: { lastName: { contains: q } } },
          ],
        }
      : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.member.count({ where }),
    db.member.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, profileImage: true } },
        ministries: {
          where: { status: 'active' },
          include: { ministry: { select: { name: true, slug: true } } },
          take: 3,
        },
      },
      orderBy: { displayName: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => ({
      id: row.id,
      name:
        row.displayName ||
        row.preferredName ||
        `${row.user.firstName} ${row.user.lastName}`.trim(),
      photo: row.showProfilePhoto ? row.user.profileImage : null,
      ministries: row.showMinistry
        ? row.ministries.map((m) => ({ name: m.ministry.name, slug: m.ministry.slug }))
        : [],
      showContactButton: row.showContactButton,
    })),
    { page, pageSize, totalItems }
  );
}
