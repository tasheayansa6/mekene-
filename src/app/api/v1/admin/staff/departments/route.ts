import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canManageStaff, canViewStaff } from '@/lib/volunteers/access';
import { departmentWriteSchema, formatZodErrors } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'staff', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewStaff(auth.user)) return forbidden();

  const rows = await db.staffDepartment.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'staff', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageStaff(auth.user)) return forbidden();

  const parsed = departmentWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const slug =
    parsed.data.slug ||
    (await uniqueSlug(parsed.data.name, async (s) => {
      const hit = await db.staffDepartment.findUnique({ where: { slug: s } });
      return Boolean(hit);
    }));

  const row = await db.staffDepartment.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 120),
      slug: slugify(slug),
      description: parsed.data.description
        ? sanitizePlainText(parsed.data.description, 400)
        : null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return success(
    {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    },
    'Department created.',
    201
  );
}
