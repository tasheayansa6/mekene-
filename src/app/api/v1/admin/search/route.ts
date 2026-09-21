import { db } from '@/lib/db';
import { success, validationError } from '@/lib/api/response';
import { enforceAdminRateLimit, guardAdminRead } from '@/lib/admin/guard';
import { formatZodErrors, searchSchema } from '@/lib/admin/validation';
import { hasPermission } from '@/lib/auth/permissions';
import { ministryWhereForUser } from '@/lib/admin/ministry-scope';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request);
  if (!auth.ok) return auth.error;

  const limited = enforceAdminRateLimit(request, auth.user.id, 'search');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: url.searchParams.get('q') || '' });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const q = parsed.data.q;
  const results: {
    users: Array<{ id: string; title: string; href: string; subtitle: string }>;
    ministries: Array<{ id: string; title: string; href: string; subtitle: string }>;
    leaders: Array<{ id: string; title: string; href: string; subtitle: string }>;
    sermons: Array<{ id: string; title: string; href: string; subtitle: string }>;
    events: Array<{ id: string; title: string; href: string; subtitle: string }>;
    prayer: Array<{ id: string; title: string; href: string; subtitle: string }>;
    gallery: Array<{ id: string; title: string; href: string; subtitle: string }>;
    members: Array<{ id: string; title: string; href: string; subtitle: string }>;
  } = { users: [], ministries: [], leaders: [], sermons: [], events: [], prayer: [], gallery: [], members: [] };

  if (hasPermission(auth.user, 'users', 'view')) {
    const users = await db.user.findMany({
      where: {
        OR: [
          { email: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
        ],
        ...(auth.user.role.slug === 'super_admin'
          ? {}
          : { NOT: { role: { slug: 'super_admin' } } }),
      },
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } },
      },
    });
    results.users = users.map((user) => ({
      id: user.id,
      title: `${user.firstName} ${user.lastName}`,
      subtitle: `${user.email} · ${user.role.name}`,
      href: `/admin/users/${user.id}`,
    }));
  }

  if (hasPermission(auth.user, 'ministries', 'view')) {
    const scoped = ministryWhereForUser(auth.user);
    const ministries = await db.ministry.findMany({
      where: {
        AND: [
          scoped || {},
          {
            OR: [{ name: { contains: q } }, { slug: { contains: q } }, { leaderName: { contains: q } }],
          },
        ],
      },
      take: 8,
      select: { id: true, name: true, category: true, status: true },
    });
    results.ministries = ministries.map((ministry) => ({
      id: ministry.id,
      title: ministry.name,
      subtitle: [ministry.category, ministry.status].filter(Boolean).join(' · '),
      href: `/admin/ministries/${ministry.id}`,
    }));
  }

  if (hasPermission(auth.user, 'leadership', 'view')) {
    const leaders = await db.leader.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { title: { contains: q } },
        ],
      },
      take: 8,
      include: { position: { select: { title: true } } },
    });
    results.leaders = leaders.map((leader) => ({
      id: leader.id,
      title: `${leader.firstName} ${leader.lastName}`,
      subtitle: leader.position?.title || leader.title || leader.status,
      href: `/admin/leadership/${leader.id}`,
    }));
  }

  if (hasPermission(auth.user, 'sermons', 'view')) {
    const sermons = await db.sermon.findMany({
      where: {
        OR: [{ title: { contains: q } }, { slug: { contains: q } }, { speakerName: { contains: q } }],
      },
      take: 8,
      select: { id: true, title: true, status: true, slug: true },
    });
    results.sermons = sermons.map((sermon) => ({
      id: sermon.id,
      title: sermon.title,
      subtitle: `${sermon.status} · ${sermon.slug}`,
      href: `/admin/sermons/${sermon.id}`,
    }));
  }

  if (hasPermission(auth.user, 'events', 'view')) {
    const events = await db.event.findMany({
      where: {
        OR: [{ title: { contains: q } }, { slug: { contains: q } }, { organizerName: { contains: q } }],
      },
      take: 8,
      select: { id: true, title: true, status: true, slug: true },
    });
    results.events = events.map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: `${event.status} · ${event.slug}`,
      href: `/admin/events/${event.id}`,
    }));
  }

  if (hasPermission(auth.user, 'prayer', 'view')) {
    const prayer = await db.prayerRequest.findMany({
      where: {
        OR: [{ title: { contains: q } }, { category: { name: { contains: q } } }],
      },
      take: 8,
      select: { id: true, title: true, status: true, visibility: true },
    });
    results.prayer = prayer.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: `${item.status} · ${item.visibility}`,
      href: `/admin/prayer/${item.id}`,
    }));
  }

  if (hasPermission(auth.user, 'gallery', 'view')) {
    const albums = await db.galleryAlbum.findMany({
      where: {
        OR: [{ title: { contains: q } }, { slug: { contains: q } }, { description: { contains: q } }],
      },
      take: 8,
      select: { id: true, title: true, status: true, slug: true },
    });
    results.gallery = albums.map((album) => ({
      id: album.id,
      title: album.title,
      subtitle: `${album.status} · ${album.slug}`,
      href: `/admin/gallery/albums/${album.id}`,
    }));
  }

  if (hasPermission(auth.user, 'members', 'view')) {
    const members = await db.member.findMany({
      where: {
        OR: [
          { membershipNumber: { contains: q } },
          { displayName: { contains: q } },
          { user: { firstName: { contains: q } } },
          { user: { lastName: { contains: q } } },
        ],
      },
      take: 8,
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    results.members = members.map((member) => ({
      id: member.id,
      title: member.displayName || `${member.user.firstName} ${member.user.lastName}`.trim(),
      subtitle: member.membershipNumber || member.status,
      href: `/admin/members/${member.id}`,
    }));
  }

  return success(results);
}
