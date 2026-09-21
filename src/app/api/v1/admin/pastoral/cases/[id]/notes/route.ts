import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canAccessCase, canManageNotes, canViewPastoral } from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { serializeNote } from '@/lib/pastoral/serialize';
import { formatZodErrors, pastoralNoteCreateSchema } from '@/lib/pastoral/validation';
import { addNote } from '@/lib/pastoral/write';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();
  if (!canManageNotes(auth.user)) return forbidden();

  const { id } = await context.params;
  const careCase = await db.pastoralCareCase.findUnique({
    where: { id },
    select: { id: true, assignedToId: true, createdById: true },
  });
  if (!careCase) return notFound('Pastoral case');
  if (!canAccessCase(auth.user, careCase)) return notFound('Pastoral case');

  const notes = await db.pastoralCareNote.findMany({
    where: { caseId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_note',
    resourceId: id,
    action: 'list',
    request,
  });

  return success(notes.map(serializeNote));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'pastoral', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canManageNotes(auth.user)) return forbidden();

  const parsed = pastoralNoteCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const careCase = await db.pastoralCareCase.findUnique({
    where: { id },
    select: { id: true, assignedToId: true, createdById: true },
  });
  if (!careCase) return notFound('Pastoral case');
  if (!canAccessCase(auth.user, careCase)) return notFound('Pastoral case');

  const note = await addNote({
    caseId: id,
    authorId: auth.user.id,
    content: parsed.data.content,
    visibility: parsed.data.visibility,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_note',
    resourceId: note.id,
    action: 'create',
    request,
  });

  return success(serializeNote(note), 'Pastoral note added.', 201);
}
