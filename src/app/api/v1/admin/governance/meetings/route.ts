import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { uniqueSlug } from '@/lib/admin/slug';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { serializeMeeting } from '@/lib/governance/serialize';
import { isOneOf, MEETING_STATUSES, MEETING_TYPES } from '@/lib/governance/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const committeeId = url.searchParams.get('committeeId') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const where = {
    ...(committeeId ? { committeeId } : {}),
    ...(status && isOneOf(status, MEETING_STATUSES) ? { status } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.governanceMeeting.count({ where }),
    db.governanceMeeting.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeMeeting), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageGovernance(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required.');
  }
  if (typeof body.startsAt !== 'string') {
    return badRequest('startsAt is required.');
  }
  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) return badRequest('Invalid startsAt.');

  const endsAt =
    typeof body.endsAt === 'string' && body.endsAt
      ? new Date(body.endsAt)
      : new Date(startsAt.getTime() + 90 * 60 * 1000);
  if (Number.isNaN(endsAt.getTime())) return badRequest('Invalid endsAt.');

  const meetingType =
    typeof body.meetingType === 'string' && isOneOf(body.meetingType, MEETING_TYPES)
      ? body.meetingType
      : 'committee';

  let eventId: string | null = null;
  if (body.createCalendarEvent === true) {
    const slug = await uniqueSlug(body.title, async (candidate) =>
      Boolean(await db.event.findUnique({ where: { slug: candidate }, select: { id: true } }))
    );
    const event = await db.event.create({
      data: {
        title: body.title.trim(),
        slug,
        startAt: startsAt,
        endAt: endsAt,
        status: 'scheduled',
        authorId: auth.user.id,
        isOnline: Boolean(body.onlineUrl),
        meetingUrl: typeof body.onlineUrl === 'string' ? body.onlineUrl : null,
        shortDescription: 'Governance meeting',
      },
    });
    eventId = event.id;
  }

  const row = await db.governanceMeeting.create({
    data: {
      title: body.title.trim(),
      meetingType,
      status:
        typeof body.status === 'string' && isOneOf(body.status, MEETING_STATUSES)
          ? body.status
          : 'scheduled',
      committeeId: typeof body.committeeId === 'string' ? body.committeeId : null,
      ministryId: typeof body.ministryId === 'string' ? body.ministryId : null,
      eventId,
      startsAt,
      endsAt,
      location: typeof body.location === 'string' ? body.location : null,
      onlineUrl: typeof body.onlineUrl === 'string' ? body.onlineUrl : null,
      chairUserId: typeof body.chairUserId === 'string' ? body.chairUserId : null,
      secretaryUserId:
        typeof body.secretaryUserId === 'string' ? body.secretaryUserId : null,
      quorumCount: typeof body.quorumCount === 'number' ? body.quorumCount : null,
      quorumPercent: typeof body.quorumPercent === 'number' ? body.quorumPercent : null,
      votingMethod:
        typeof body.votingMethod === 'string' ? (body.votingMethod as never) : null,
    },
  });

  await emitGovernanceEvent({
    type: 'meeting_created',
    actorId: auth.user.id,
    entityId: row.id,
    request,
    details: { title: row.title, eventId },
  });

  return success(serializeMeeting(row), 'Meeting created.', 201);
}
