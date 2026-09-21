import { db } from '@/lib/db';
import {
  error,
  forbidden,
  paginated,
  success,
  validationError,
} from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { readJson } from '@/lib/auth/http';
import {
  canChangeMinistryStatus,
  ministryWhereForUser,
} from '@/lib/admin/ministry-scope';
import { uniqueSlug } from '@/lib/admin/slug';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  formatZodErrors,
  ministryListSchema,
  ministryWriteSchema,
} from '@/lib/admin/validation';

function serializeMinistry(ministry: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  leaderName: string | null;
  category: string | null;
  imageUrl: string | null;
  status: string;
  isActive: boolean;
  sortOrder: number;
  leaderUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...ministry,
    createdAt: ministry.createdAt.toISOString(),
    updatedAt: ministry.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = ministryListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
    status: url.searchParams.get('status') || undefined,
    category: url.searchParams.get('category') || undefined,
    active: url.searchParams.get('active') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, sort, dir, status, category, active } = parsed.data;
  const scoped = ministryWhereForUser(auth.user);
  const where: Record<string, unknown> = { ...(scoped || {}) };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { leaderName: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (category) where.category = category;
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;

  const orderField = ['name', 'createdAt', 'status', 'sortOrder'].includes(sort || '')
    ? (sort as 'name' | 'createdAt' | 'status' | 'sortOrder')
    : 'sortOrder';
  const orderDir = dir === 'desc' ? 'desc' : 'asc';

  const [totalItems, ministries] = await Promise.all([
    db.ministry.count({ where }),
    db.ministry.findMany({
      where,
      orderBy: [{ [orderField]: orderDir }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(ministries.map(serializeMinistry), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'ministries', 'create');
  if (!auth.ok) return auth.error;

  const parsed = ministryWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (auth.user.role.slug === 'ministry_leader') {
    return forbidden('You cannot create ministries.');
  }

  const data = parsed.data;
  const slug = data.slug
    ? data.slug
    : await uniqueSlug(data.name, async (value) =>
        Boolean(await db.ministry.findUnique({ where: { slug: value } }))
      );

  const existing = await db.ministry.findUnique({ where: { slug } });
  if (existing) return error('A ministry with this slug already exists.', 409);

  let status = data.status || 'draft';
  if (status !== 'draft' && !canChangeMinistryStatus(auth.user)) {
    status = 'draft';
  }

  const ministry = await db.ministry.create({
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      leaderName: data.leaderName ?? null,
      category: data.category ?? null,
      imageUrl: data.imageUrl || null,
      status,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      leaderUserId: data.leaderUserId ?? null,
    },
  });

  await logSecurityEvent({
    action: 'create',
    entity: 'ministry',
    entityId: ministry.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { name: ministry.name, slug: ministry.slug },
  });

  return success(serializeMinistry(ministry), 'Ministry created.', 201);
}
