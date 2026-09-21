import { db } from '@/lib/db';
import { forbidden, notFound, paginated, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid, readJson } from '@/lib/auth/http';
import { isPubliclyVisible } from '@/lib/content/status';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const where = { userId: auth.user.id };
  const [totalItems, rows] = await Promise.all([
    db.sermonBookmark.count({ where }),
    db.sermonBookmark.findMany({
      where,
      include: {
        sermon: {
          select: {
            id: true,
            title: true,
            slug: true,
            sermonDate: true,
            thumbnailUrl: true,
            status: true,
            accessLevel: true,
            speakerName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(
    rows
      .filter((row) => isPubliclyVisible(row.sermon) || row.sermon.status === 'published')
      .map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        sermon: {
          id: row.sermon.id,
          title: row.sermon.title,
          slug: row.sermon.slug,
          sermonDate: row.sermon.sermonDate.toISOString(),
          thumbnailUrl: row.sermon.thumbnailUrl,
          speakerName: row.sermon.speakerName,
        },
      })),
    { page, pageSize, totalItems }
  );
}

const createSchema = z.object({
  sermonId: z.string().min(1).optional(),
  sermonSlug: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  if (!parsed.data.sermonId && !parsed.data.sermonSlug) {
    return validationError({ sermonId: ['sermonId or sermonSlug is required.'] });
  }

  const sermon = await db.sermon.findFirst({
    where: parsed.data.sermonId
      ? { id: parsed.data.sermonId }
      : { slug: parsed.data.sermonSlug },
  });
  if (!sermon || !isPubliclyVisible(sermon)) return notFound('Sermon');
  if (sermon.accessLevel === 'restricted') return forbidden();

  const bookmark = await db.sermonBookmark.upsert({
    where: {
      userId_sermonId: { userId: auth.user.id, sermonId: sermon.id },
    },
    update: {},
    create: { userId: auth.user.id, sermonId: sermon.id },
  });

  return success({ bookmark: { id: bookmark.id, sermonId: sermon.id } }, 'Bookmarked.', 201);
}
