import { db } from '@/lib/db';
import { forbidden, notFound, tooManyRequests } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewMembers } from '@/lib/members/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { memberDocumentRelativePath } from '@/lib/pastoral/documents';
import { verifySignedMediaToken } from '@/lib/sermons/media-security';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();

  const { id: memberId, docId } = await context.params;
  const doc = await db.memberDocument.findFirst({
    where: { id: docId, memberId },
  });
  if (!doc) return notFound('Document');

  const relative = memberDocumentRelativePath(doc.fileUrl);
  if (!relative) return notFound('File');

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token) {
    const verified = verifySignedMediaToken(token, relative);
    if (!verified.ok) return forbidden('Download link expired or invalid.');
  }

  const limited = rateLimitKey(
    `member-doc:${docId}:${auth.user.id}:${getClientIp(request)}`,
    20,
    10 * 60 * 1000
  );
  if (!limited.allowed) {
    return tooManyRequests('Please wait before downloading again.', limited.retryAfterSeconds);
  }

  const file = await readFile(path.join(process.cwd(), 'public', relative)).catch(() => null);
  if (!file) return notFound('File');

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'member_document',
    resourceId: docId,
    action: 'download',
    request,
  });

  const filename = (doc.fileName || 'document').replace(/"/g, '');
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': doc.fileMime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
