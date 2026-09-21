import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canManageVolunteers, canViewVolunteers } from '@/lib/volunteers/access';
import { formatZodErrors, skillCatalogSchema } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();
  const rows = await db.volunteerSkillCatalog.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return success({ skills: rows });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'volunteers', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageVolunteers(auth.user)) return forbidden();
  const parsed = skillCatalogSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (s) =>
      Boolean(await db.volunteerSkillCatalog.findUnique({ where: { slug: s } }))
    ));
  const count = await db.volunteerSkillCatalog.count();
  const row = await db.volunteerSkillCatalog.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 120),
      slug: slugify(slug),
      isActive: parsed.data.isActive ?? true,
      sortOrder: count,
    },
  });
  return success(row, 'Skill added.', 201);
}
