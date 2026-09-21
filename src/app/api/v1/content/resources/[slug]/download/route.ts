import { db } from '@/lib/db';
import { notFound, success, tooManyRequests } from '@/lib/api/response';
import { promoteScheduledContent } from '@/lib/content/query';
import { isPubliclyVisible } from '@/lib/content/status';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  await promoteScheduledContent();
  const { slug } = await context.params;
  const resource = await db.resource.findUnique({ where: { slug } });
  if (!resource || !isPubliclyVisible(resource) || !resource.fileUrl) {
    return notFound('Resource');
  }

  const limited = rateLimitKey(
    `download:${resource.id}:${getClientIp(request)}`,
    3,
    10 * 60 * 1000
  );
  if (!limited.allowed) {
    return tooManyRequests('Please wait before downloading this file again.', limited.retryAfterSeconds);
  }

  const relative = resource.fileUrl.replace(/^\//, '');
  if (!relative.startsWith('uploads/resources/')) {
    return notFound('Resource');
  }
  const absolute = path.join(process.cwd(), 'public', relative.split('?')[0]);
  const file = await readFile(absolute).catch(() => null);
  if (!file) return notFound('Resource');

  await db.resource.update({
    where: { id: resource.id },
    data: { downloadCount: { increment: 1 } },
  });

  const filename = resource.fileName || `${resource.slug}.bin`;
  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      'Content-Type': resource.fileMime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}

export async function HEAD(_request: Request, context: RouteContext) {
  await promoteScheduledContent();
  const { slug } = await context.params;
  const resource = await db.resource.findUnique({ where: { slug } });
  if (!resource || !isPubliclyVisible(resource)) return notFound('Resource');
  return success({ slug: resource.slug, title: resource.title });
}
