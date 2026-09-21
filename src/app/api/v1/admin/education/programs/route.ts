import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canCreateEducation, canViewEducation } from '@/lib/education/access';
import { createProgram, listPrograms } from '@/lib/education/programs';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'education', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewEducation(auth.user)) return forbidden();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Number(url.searchParams.get('pageSize') || 50);

  const result = await listPrograms({ status, page, pageSize });
  return paginated(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'education', 'create');
  if (!auth.ok) return auth.error;
  if (!canCreateEducation(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return badRequest('name is required');
  }

  const program = await createProgram({
    name: body.name,
    slug: typeof body.slug === 'string' ? body.slug : undefined,
    description: typeof body.description === 'string' ? body.description : null,
    durationLabel: typeof body.durationLabel === 'string' ? body.durationLabel : null,
    requirements: typeof body.requirements === 'string' ? body.requirements : null,
    certificateInfo: typeof body.certificateInfo === 'string' ? body.certificateInfo : null,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    status:
      body.status === 'published' || body.status === 'archived' || body.status === 'draft'
        ? body.status
        : 'draft',
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  });

  return success(program, 'Program created.', 201);
}
