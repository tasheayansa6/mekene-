import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { slugify, uniqueSlug } from '@/lib/admin/slug';
import { db } from '@/lib/db';
import { bookableResourceWriteSchema, formatZodErrors } from '@/lib/events/validation';
import {
  createBookableResource,
  listBookableResources,
  updateBookableResource,
} from '@/lib/events/resources';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const all = url.searchParams.get('all') === 'true';
  const rows = await listBookableResources(!all);
  return success(rows);
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'events', 'manage');
  if (!auth.ok) return auth.error;
  const parsed = bookableResourceWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const slug = await uniqueSlug(parsed.data.slug?.trim() || parsed.data.name, async (candidate) => {
    const row = await db.bookableResource.findFirst({ where: { slug: candidate }, select: { id: true } });
    return Boolean(row);
  });
  const row = await createBookableResource({ ...parsed.data, slug });
  return success(row, 'Resource created.', 201);
}
