import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canManageGovernance,
  canManageMeeting,
} from '@/lib/governance/access';
import { emitGovernanceEvent } from '@/lib/governance/events';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: true },
  });
  if (!meeting) return notFound('Meeting');
  if (!canManageMeeting(auth.user, meeting)) return forbidden();

  if (meeting.agendaLocked && !canManageGovernance(auth.user)) {
    return forbidden('Agenda is locked.');
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required.');
  }

  const maxOrder = await db.agendaItem.aggregate({
    where: { meetingId },
    _max: { sortOrder: true },
  });

  const item = await db.agendaItem.create({
    data: {
      meetingId,
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      presenterId: typeof body.presenterId === 'string' ? body.presenterId : null,
      priority: typeof body.priority === 'number' ? body.priority : 0,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      durationMin: typeof body.durationMin === 'number' ? body.durationMin : null,
      attachmentUrl: typeof body.attachmentUrl === 'string' ? body.attachmentUrl : null,
    },
  });

  await emitGovernanceEvent({
    type: 'agenda_changed',
    actorId: auth.user.id,
    entityId: meetingId,
    request,
    details: { agendaItemId: item.id },
  });

  return success(item, 'Agenda item added.', 201);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'governance', 'update');
  if (!auth.ok) return auth.error;

  const { id: meetingId } = await context.params;
  const meeting = await db.governanceMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: true },
  });
  if (!meeting) return notFound('Meeting');
  if (!canManageMeeting(auth.user, meeting)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return badRequest('Invalid body.');

  if (body.lock === true) {
    const updated = await db.governanceMeeting.update({
      where: { id: meetingId },
      data: { agendaLocked: true },
    });
    await emitGovernanceEvent({
      type: 'agenda_locked',
      actorId: auth.user.id,
      entityId: meetingId,
      request,
    });
    return success({ id: updated.id, agendaLocked: updated.agendaLocked }, 'Agenda locked.');
  }

  if (meeting.agendaLocked && !canManageGovernance(auth.user)) {
    return forbidden('Agenda is locked.');
  }

  if (Array.isArray(body.items)) {
    const items = body.items as Array<{ id: string; sortOrder?: number; status?: string }>;
    await db.$transaction(
      items.map((item) =>
        db.agendaItem.update({
          where: { id: item.id },
          data: {
            ...(typeof item.sortOrder === 'number' ? { sortOrder: item.sortOrder } : {}),
            ...(typeof item.status === 'string' ? { status: item.status as never } : {}),
          },
        })
      )
    );
    await emitGovernanceEvent({
      type: 'agenda_changed',
      actorId: auth.user.id,
      entityId: meetingId,
      request,
      details: { reorder: true },
    });
    const agenda = await db.agendaItem.findMany({
      where: { meetingId },
      orderBy: { sortOrder: 'asc' },
    });
    return success(agenda, 'Agenda updated.');
  }

  return badRequest('Provide { lock: true } or { items: [...] }.');
}
