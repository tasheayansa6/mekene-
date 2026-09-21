import { db } from '@/lib/db';
import {
  badRequest,
  forbidden,
  notFound,
  paginated,
  success,
} from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { serializeRequest } from '@/lib/governance/serialize';
import {
  ADMIN_REQUEST_PRIORITIES,
  isOneOf,
} from '@/lib/governance/status';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return success([]);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = { memberId: member.id };
  const [totalItems, rows] = await Promise.all([
    db.administrativeRequest.count({ where }),
    db.administrativeRequest.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows.map((row) => serializeRequest(row, { includeInternalNotes: false })),
    { page, pageSize, totalItems }
  );
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return forbidden('A member profile is required to submit requests.');

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.categoryId !== 'string') {
    return badRequest('categoryId is required.');
  }
  if (typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required.');
  }
  if (typeof body.description !== 'string' || !body.description.trim()) {
    return badRequest('description is required.');
  }

  const category = await db.adminRequestCategory.findFirst({
    where: { id: body.categoryId, isActive: true },
  });
  if (!category) return notFound('Category');

  const priority =
    typeof body.priority === 'string' && isOneOf(body.priority, ADMIN_REQUEST_PRIORITIES)
      ? body.priority
      : 'normal';

  const responseDueAt =
    category.slaHours != null
      ? new Date(Date.now() + category.slaHours * 60 * 60 * 1000)
      : null;

  const row = await db.administrativeRequest.create({
    data: {
      categoryId: body.categoryId,
      memberId: member.id,
      title: body.title.trim(),
      description: body.description.trim(),
      priority,
      status: 'submitted',
      responseDueAt,
    },
    include: {
      category: { select: { name: true, slug: true } },
      notes: true,
    },
  });

  await emitGovernanceEvent({
    type: 'request_submitted',
    actorId: auth.user.id,
    entityId: row.id,
    request,
    relatedUrl: '/member/requests',
  });

  return success(
    serializeRequest(row, { includeInternalNotes: false }),
    'Request submitted.',
    201
  );
}
