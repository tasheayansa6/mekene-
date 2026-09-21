import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canManageVolunteers, canViewVolunteers } from '@/lib/volunteers/access';
import { serializeVolunteerRole } from '@/lib/volunteers/serialize';
import { formatZodErrors, volunteerRoleSchema } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'volunteers', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();
  const ministryId = new URL(request.url).searchParams.get('ministryId') || undefined;
  const rows = await db.volunteerRole.findMany({
    where: { ...(ministryId ? { ministryId } : {}), isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: 200,
  });
  return success({ roles: rows.map(serializeVolunteerRole) });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'volunteers', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageVolunteers(auth.user)) return forbidden();
  const parsed = volunteerRoleSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (s) =>
      Boolean(await db.volunteerRole.findUnique({ where: { slug: s } }))
    ));
  const row = await db.volunteerRole.create({
    data: {
      ministryId: parsed.data.ministryId || null,
      teamId: parsed.data.teamId || null,
      name: sanitizePlainText(parsed.data.name, 120),
      slug: slugify(slug),
      description: parsed.data.description
        ? sanitizePlainText(parsed.data.description, 1000)
        : null,
      requiredSkillId: parsed.data.requiredSkillId || null,
      requiredProgramId: parsed.data.requiredProgramId || null,
      slotsRequired: parsed.data.slotsRequired ?? 1,
      requireTeamMembership: parsed.data.requireTeamMembership ?? false,
      isActive: parsed.data.isActive ?? true,
    },
  });
  return success(serializeVolunteerRole(row), 'Role created.', 201);
}
