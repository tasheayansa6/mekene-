import { db } from '@/lib/db';
import { badRequest, forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { canAccessOwnRequest } from '@/lib/governance/access';
import { serializeRequest } from '@/lib/governance/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });

  const { id } = await context.params;
  const row = await db.administrativeRequest.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, slug: true } },
      notes: { orderBy: { createdAt: 'asc' } },
      member: { select: { id: true, userId: true } },
    },
  });
  if (!row) return notFound('Request');

  if (
    !canAccessOwnRequest(
      auth.user,
      row.member.userId,
      row.memberId,
      member?.id ?? null
    )
  ) {
    return forbidden();
  }

  return success(serializeRequest(row, { includeInternalNotes: false }));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });

  const { id } = await context.params;
  const existing = await db.administrativeRequest.findUnique({
    where: { id },
    include: { member: { select: { id: true, userId: true } } },
  });
  if (!existing) return notFound('Request');

  if (
    !canAccessOwnRequest(
      auth.user,
      existing.member.userId,
      existing.memberId,
      member?.id ?? null
    )
  ) {
    return forbidden();
  }

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.body !== 'string' || !body.body.trim()) {
    return badRequest('body is required.');
  }

  await db.adminRequestNote.create({
    data: {
      requestId: id,
      authorId: auth.user.id,
      body: body.body.trim(),
      isInternal: false,
    },
  });

  const row = await db.administrativeRequest.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, slug: true } },
      notes: { orderBy: { createdAt: 'asc' } },
    },
  });

  return success(
    serializeRequest(row!, { includeInternalNotes: false }),
    'Comment added.',
    201
  );
}
