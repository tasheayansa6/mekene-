import { db } from '@/lib/db';
import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { guardPrayerAdminWrite } from '@/lib/prayer/guard';
import { formatZodErrors, prayerNoteSchema } from '@/lib/prayer/validation';
import { prayerAdminInclude, serializeAdminDetail } from '@/lib/prayer/serialize';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminWrite(request, 'update');
  if (!auth.ok) return auth.error;

  const parsed = prayerNoteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.prayerRequest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return notFound('Prayer request');

  await db.prayerNote.create({
    data: {
      requestId: id,
      authorId: auth.user.id,
      body: sanitizePlainText(parsed.data.body, 4000),
    },
  });

  const row = await db.prayerRequest.findUnique({
    where: { id },
    include: prayerAdminInclude,
  });
  if (!row) return notFound('Prayer request');
  return success(serializeAdminDetail(row, auth.user), 'Internal note added.');
}
