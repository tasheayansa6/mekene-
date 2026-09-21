import { db } from '@/lib/db';
import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { isValidSubtitleFormat } from '@/lib/library/hash';
import { attachSubtitle } from '@/lib/library/reports';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const subtitleSchema = z.object({
  sermonId: z.string().min(1),
  language: z.string().min(2).max(10).default('en'),
  format: z.string().min(2).max(5),
  fileUrl: z.string().min(1).max(500),
  label: z.string().max(120).optional(),
  isDefault: z.boolean().optional(),
});

async function guardMediaWrite(request: Request) {
  let auth = await guardAdminWrite(request, 'media', 'update');
  if (!auth.ok) auth = await guardAdminWrite(request, 'sermons', 'update');
  return auth;
}

export async function POST(request: Request) {
  const auth = await guardMediaWrite(request);
  if (!auth.ok) return auth.error;

  const parsed = subtitleSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const format = parsed.data.format.trim().toLowerCase();
  if (!isValidSubtitleFormat(format)) {
    return validationError({ format: ['Only .vtt and .srt subtitle formats are supported.'] });
  }
  if (!parsed.data.fileUrl.toLowerCase().endsWith(`.${format}`)) {
    return validationError({ fileUrl: [`Subtitle file must use .${format} extension.`] });
  }

  const sermon = await db.sermon.findUnique({ where: { id: parsed.data.sermonId } });
  if (!sermon) return notFound('Sermon');

  const subtitle = await attachSubtitle({
    sermonId: parsed.data.sermonId,
    language: parsed.data.language,
    format,
    fileUrl: parsed.data.fileUrl,
    label: parsed.data.label,
    isDefault: parsed.data.isDefault,
    uploadedById: auth.user.id,
  });

  return success(
    {
      subtitle: {
        id: subtitle.id,
        sermonId: subtitle.sermonId,
        language: subtitle.language,
        format: subtitle.format,
        fileUrl: subtitle.fileUrl,
        isDefault: subtitle.isDefault,
      },
    },
    'Subtitle attached.',
    201
  );
}
