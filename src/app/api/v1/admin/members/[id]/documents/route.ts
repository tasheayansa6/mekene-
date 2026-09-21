import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canUpdateMembers, canViewMembers } from '@/lib/members/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { serializeMemberDocument } from '@/lib/pastoral/serialize';
import { formatZodErrors, memberDocumentCreateSchema } from '@/lib/pastoral/validation';
import { saveMemberDocumentFile } from '@/lib/pastoral/documents';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { createSignedMediaToken } from '@/lib/sermons/media-security';

const docInclude = {
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();

  const { id: memberId } = await context.params;
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!member) return notFound('Member');

  const rows = await db.memberDocument.findMany({
    where: { memberId },
    include: docInclude,
    orderBy: { createdAt: 'desc' },
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'member_document',
    resourceId: memberId,
    action: 'list',
    request,
  });

  return success(
    rows.map((row) => {
      const relative = row.fileUrl.replace(/^\//, '');
      const signed = createSignedMediaToken({
        path: relative,
        userId: auth.user.id,
        ttlSeconds: 15 * 60,
      });
      return {
        ...serializeMemberDocument(row),
        downloadToken: signed.token,
        downloadExpiresAt: signed.expiresAt,
      };
    })
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'update');
  if (!auth.ok) return auth.error;
  if (!canUpdateMembers(auth.user)) return forbidden();

  const { id: memberId } = await context.params;
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!member) return notFound('Member');

  const form = await request.formData().catch(() => null);
  if (!form) return validationError({ file: ['Upload a file'] });

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return validationError({ file: ['A file is required'] });
  }

  const parsed = memberDocumentCreateSchema.safeParse({
    title: form.get('title') || file.name,
    retentionUntil: form.get('retentionUntil') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  let retentionUntil: Date | null = null;
  if (parsed.data.retentionUntil) {
    retentionUntil = new Date(parsed.data.retentionUntil);
    if (Number.isNaN(retentionUntil.getTime())) {
      return validationError({ retentionUntil: ['Invalid date'] });
    }
  }

  let saved;
  try {
    saved = await saveMemberDocumentFile(file, memberId);
  } catch (err) {
    return validationError({
      file: [err instanceof Error ? err.message : 'Upload failed'],
    });
  }

  const row = await db.memberDocument.create({
    data: {
      memberId,
      uploadedById: auth.user.id,
      title: sanitizePlainText(parsed.data.title, 180),
      fileUrl: saved.fileUrl,
      fileName: saved.fileName,
      fileMime: saved.fileMime,
      fileSize: saved.fileSize,
      retentionUntil,
    },
    include: docInclude,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'member_document',
    resourceId: row.id,
    action: 'create',
    request,
  });

  return success(serializeMemberDocument(row), 'Document uploaded.', 201);
}
