import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canDeleteContent } from '@/lib/content/access';
import { logContentChange, sanitizePlainText, uniqueContentSlug } from '@/lib/content/admin-write';
import { formatZodErrors, tagWriteSchema } from '@/lib/content/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const parsed = tagWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const existing = await db.contentTag.findUnique({ where: { id } });
  if (!existing) return notFound('Tag');
  const slug =
    parsed.data.name || parsed.data.slug
      ? await uniqueContentSlug('contentTag', parsed.data.name || existing.name, parsed.data.slug, id)
      : existing.slug;
  const clash = await db.contentTag.findFirst({ where: { slug, id: { not: id } } });
  if (clash) return error('A tag with this slug already exists.', 409);
  const updated = await db.contentTag.update({
    where: { id },
    data: {
      name: parsed.data.name ? sanitizePlainText(parsed.data.name, 40) : undefined,
      slug,
    },
  });
  await logContentChange({
    type: 'content.updated',
    entity: 'content_tag',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: updated.name },
  });
  return success(updated, 'Tag updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'delete');
  if (!auth.ok) return auth.error;
  if (!canDeleteContent(auth.user)) return forbidden();
  const { id } = await context.params;
  const existing = await db.contentTag.findUnique({ where: { id } });
  if (!existing) return notFound('Tag');
  await db.contentTag.delete({ where: { id } });
  await logContentChange({
    type: 'content.deleted',
    entity: 'content_tag',
    entityId: id,
    userId: auth.user.id,
    request,
    details: { name: existing.name },
  });
  return success({ id }, 'Tag deleted.');
}
