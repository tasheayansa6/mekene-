import { db } from '@/lib/db';
import { badRequest, forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { createCase } from '@/lib/pastoral/write';
import { listMemberCareDashboard } from '@/lib/pastoral/member-care';
import { emitPastoralEvent } from '@/lib/pastoral/events';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const data = await listMemberCareDashboard(auth.user.id);
  return success(data);
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) {
    return forbidden('A member profile is required to submit a care request.');
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || body.type !== 'care_request') {
    return badRequest('type must be care_request');
  }
  if (typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required');
  }

  const categoryId =
    typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : null;
  const description =
    typeof body.description === 'string' ? body.description.trim() : null;
  const preferredContact =
    typeof body.preferredContact === 'string' ? body.preferredContact.trim() : null;

  const summaryParts = [
    description,
    preferredContact ? `Preferred contact: ${preferredContact}` : null,
  ].filter(Boolean);

  const row = await createCase({
    memberId: member.id,
    categoryId,
    title: body.title.trim(),
    summary: summaryParts.length ? summaryParts.join('\n\n') : null,
    priority: 'normal',
    createdById: auth.user.id,
    request,
  });

  // Notify a pastoral staff member if one exists (generic copy only)
  const pastoralUser = await db.user.findFirst({
    where: {
      role: { slug: { in: ['pastor', 'pastoral_care'] } },
      status: 'active',
    },
    select: { id: true },
  });
  if (pastoralUser && pastoralUser.id !== auth.user.id) {
    await emitPastoralEvent({
      type: 'case_assigned',
      actorId: auth.user.id,
      entityId: row.id,
      recipientUserId: pastoralUser.id,
      request,
    });
  }

  return success(
    {
      id: row.id,
      title: row.title,
      status: row.status,
      openedAt: row.openedAt.toISOString(),
    },
    'Care request submitted.',
    201
  );
}
