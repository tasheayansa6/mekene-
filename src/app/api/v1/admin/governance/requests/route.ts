import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canAssignGovernance,
  canManageGovernance,
  canViewGovernance,
  canViewInternalRequestNotes,
} from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';
import { serializeRequest } from '@/lib/governance/serialize';
import { canTransitionRequest } from '@/lib/governance/workflow';
import {
  ADMIN_REQUEST_PRIORITIES,
  ADMIN_REQUEST_STATUSES,
  isOneOf,
} from '@/lib/governance/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;
  const priority = url.searchParams.get('priority') || undefined;

  const where = {
    ...(status && isOneOf(status, ADMIN_REQUEST_STATUSES) ? { status } : {}),
    ...(priority && isOneOf(priority, ADMIN_REQUEST_PRIORITIES) ? { priority } : {}),
  };

  const includeInternal = canViewInternalRequestNotes(auth.user);

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
    rows.map((row) => serializeRequest(row, { includeInternalNotes: includeInternal })),
    { page, pageSize, totalItems }
  );
}

export async function PATCH(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'assign');
  if (!auth.ok) return auth.error;
  if (!canAssignGovernance(auth.user) && !canManageGovernance(auth.user)) {
    return forbidden();
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== 'string') {
    return badRequest('id is required.');
  }

  const existing = await db.administrativeRequest.findUnique({
    where: { id: body.id },
    include: {
      category: { select: { name: true, slug: true } },
      notes: true,
      member: { select: { userId: true } },
    },
  });
  if (!existing) return notFound('Request');

  const data: Record<string, unknown> = {};

  if (typeof body.assigneeUserId === 'string' || body.assigneeUserId === null) {
    data.assigneeUserId = body.assigneeUserId;
    if (body.assigneeUserId && existing.status === 'submitted') {
      data.status = 'assigned';
    }
  }
  if (typeof body.assignedMinistryId === 'string' || body.assignedMinistryId === null) {
    data.assignedMinistryId = body.assignedMinistryId;
  }
  if (typeof body.assignedCommitteeId === 'string' || body.assignedCommitteeId === null) {
    data.assignedCommitteeId = body.assignedCommitteeId;
  }

  if (typeof body.status === 'string') {
    if (!canTransitionRequest(existing.status, body.status)) {
      return badRequest(
        `Cannot transition request from ${existing.status} to ${body.status}.`
      );
    }
    data.status = body.status;
    if (body.status === 'completed') data.completedAt = new Date();
  }

  await db.administrativeRequest.update({
    where: { id: body.id },
    data,
  });

  if (typeof body.note === 'string' && body.note.trim()) {
    await db.adminRequestNote.create({
      data: {
        requestId: body.id,
        authorId: auth.user.id,
        body: body.note.trim(),
        isInternal: body.isInternal !== false,
      },
    });
  }

  if (data.assigneeUserId && typeof data.assigneeUserId === 'string') {
    await emitGovernanceEvent({
      type: 'request_assigned',
      actorId: auth.user.id,
      entityId: existing.id,
      recipientUserId: data.assigneeUserId,
      request,
    });
  }
  if (typeof body.status === 'string') {
    await emitGovernanceEvent({
      type: 'request_status_changed',
      actorId: auth.user.id,
      entityId: existing.id,
      recipientUserId: existing.member.userId,
      request,
      details: { from: existing.status, to: body.status },
    });
  }

  const withNotes = await db.administrativeRequest.findUnique({
    where: { id: body.id },
    include: {
      category: { select: { name: true, slug: true } },
      notes: { orderBy: { createdAt: 'asc' } },
    },
  });

  return success(
    serializeRequest(withNotes!, {
      includeInternalNotes: canViewInternalRequestNotes(auth.user),
    }),
    'Request updated.'
  );
}
