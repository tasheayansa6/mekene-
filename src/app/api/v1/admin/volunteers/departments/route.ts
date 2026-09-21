import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canAccessMinistry, canManageVolunteers, canViewVolunteers } from '@/lib/volunteers/access';
import { departmentWriteSchemaVolunteer, formatZodErrors } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user)) return forbidden();
  const ministryId = new URL(request.url).searchParams.get('ministryId') || undefined;
  const rows = await db.ministryDepartment.findMany({
    where: ministryId ? { ministryId } : {},
    orderBy: { name: 'asc' },
  });
  return success({ departments: rows });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageVolunteers(auth.user)) return forbidden();
  const parsed = departmentWriteSchemaVolunteer.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const ministry = await db.ministry.findUnique({
    where: { id: parsed.data.ministryId },
    select: { id: true, leaderUserId: true },
  });
  if (!ministry || !canAccessMinistry(auth.user, ministry)) return forbidden();
  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (s) =>
      Boolean(
        await db.ministryDepartment.findUnique({
          where: { ministryId_slug: { ministryId: parsed.data.ministryId, slug: s } },
        })
      )
    ));
  const row = await db.ministryDepartment.create({
    data: {
      ministryId: parsed.data.ministryId,
      name: sanitizePlainText(parsed.data.name, 120),
      slug: slugify(slug),
      description: parsed.data.description
        ? sanitizePlainText(parsed.data.description, 400)
        : null,
    },
  });
  return success(row, 'Department created.', 201);
}
