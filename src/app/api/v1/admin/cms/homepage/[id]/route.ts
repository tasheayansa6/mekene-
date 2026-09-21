import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { updateHomepageSection } from '@/lib/cms/homepage';
import { formatZodErrors, homepageSectionUpdateSchema } from '@/lib/cms/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const section = await db.cmsHomepageSection.findUnique({ where: { id } });
  if (!section) return notFound('Homepage section');
  return success(section);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await db.cmsHomepageSection.findUnique({ where: { id } });
  if (!existing) return notFound('Homepage section');

  const parsed = homepageSectionUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const updated = await updateHomepageSection(id, parsed.data);
  return success(updated, 'Homepage section updated.');
}
