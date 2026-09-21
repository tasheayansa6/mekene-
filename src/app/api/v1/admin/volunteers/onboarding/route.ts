import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canManageVolunteers, canViewVolunteers } from '@/lib/volunteers/access';
import { formatZodErrors, onboardingTemplateSchema } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();
  const rows = await db.volunteerOnboardingTemplate.findMany({
    include: { items: { orderBy: { sortOrder: 'asc' } }, _count: { select: { progress: true } } },
    orderBy: { name: 'asc' },
  });
  return success({ templates: rows });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'volunteers', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageVolunteers(auth.user)) return forbidden();
  const parsed = onboardingTemplateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (s) =>
      Boolean(await db.volunteerOnboardingTemplate.findUnique({ where: { slug: s } }))
    ));
  const row = await db.volunteerOnboardingTemplate.create({
    data: {
      ministryId: parsed.data.ministryId || null,
      name: sanitizePlainText(parsed.data.name, 160),
      slug: slugify(slug),
      items: parsed.data.items?.length
        ? {
            create: parsed.data.items.map((item, index) => ({
              title: sanitizePlainText(item.title, 160),
              sortOrder: index,
              isRequired: item.isRequired ?? true,
              programId: item.programId || null,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });
  return success(row, 'Onboarding template created.', 201);
}
