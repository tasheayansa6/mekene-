import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';
import { sanitizePlainText } from '@/lib/content/sanitize';

const typeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(400).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.membershipType.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  return success(rows);
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'members', 'manage');
  if (!auth.ok) return auth.error;
  const parsed = typeSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const slug = await uniqueSlug(parsed.data.slug || parsed.data.name, async (candidate) => {
    const row = await db.membershipType.findFirst({ where: { slug: candidate }, select: { id: true } });
    return Boolean(row);
  });
  const row = await db.membershipType.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 80),
      slug: slug || slugify(parsed.data.name),
      description: parsed.data.description ? sanitizePlainText(parsed.data.description, 400) : null,
      isActive: parsed.data.isActive ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
      createdById: auth.user.id,
    },
  });
  return success(row, 'Membership type created.', 201);
}
