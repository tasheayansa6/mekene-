import { db } from '@/lib/db';
import { forbidden, notFound, tooManyRequests } from '@/lib/api/response';
import { promoteScheduledContent } from '@/lib/content/query';
import { isPubliclyVisible } from '@/lib/content/status';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { requireAuth } from '@/lib/auth/authorize';
import { hasPermission } from '@/lib/auth/permissions';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { verifySignedMediaToken } from '@/lib/sermons/media-security';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  await promoteScheduledContent();
  const { slug } = await context.params;
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') === 'notes' ? 'notes' : 'audio';
  const token = url.searchParams.get('token');

  const sermon = await db.sermon.findUnique({ where: { slug } });
  if (!sermon || !isPubliclyVisible(sermon)) return notFound('Sermon');

  const access = sermon.accessLevel || 'public';
  const fileUrl = kind === 'notes' ? sermon.notesFileUrl : sermon.audioUrl;
  if (!fileUrl) return notFound('File');
  if (kind === 'audio' && sermon.allowDownload === false) {
    return forbidden('Downloads are disabled for this sermon.');
  }

  const relative = fileUrl.replace(/^\//, '').split('?')[0];
  if (!relative.startsWith('uploads/sermons/')) return notFound('File');

  if (access === 'restricted') {
    if (token) {
      const verified = verifySignedMediaToken(token, relative);
      if (!verified.ok) return forbidden('Download link expired or invalid.');
    } else {
      const auth = await requireAuth(request);
      if (!auth.ok) return auth.error;
      if (
        !hasPermission(auth.user, 'sermons', 'view') &&
        !hasPermission(auth.user, 'media', 'view') &&
        !hasPermission(auth.user, 'sermons', 'manage')
      ) {
        return forbidden();
      }
    }
  } else if (access === 'members') {
    if (token) {
      const verified = verifySignedMediaToken(token, relative);
      if (!verified.ok) return forbidden('Download link expired or invalid.');
    } else {
      const auth = await requireAuth(request);
      if (!auth.ok) return auth.error;
    }
  }

  const limited = rateLimitKey(
    `sermon-download:${sermon.id}:${kind}:${getClientIp(request)}`,
    5,
    10 * 60 * 1000
  );
  if (!limited.allowed) {
    return tooManyRequests('Please wait before downloading again.', limited.retryAfterSeconds);
  }

  const file = await readFile(path.join(process.cwd(), 'public', relative)).catch(() => null);
  if (!file) return notFound('File');

  await db.sermon.update({
    where: { id: sermon.id },
    data:
      kind === 'notes'
        ? { notesDownloads: { increment: 1 } }
        : { audioDownloads: { increment: 1 } },
  });

  const filename =
    (kind === 'notes' ? sermon.notesFileName : sermon.audioFileName) ||
    `${sermon.slug}.${kind === 'notes' ? 'pdf' : 'mp3'}`;
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type':
        (kind === 'notes' ? sermon.notesFileMime : sermon.audioMime) ||
        'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'Cache-Control': access === 'public' ? 'private, max-age=60' : 'private, no-store',
    },
  });
}
