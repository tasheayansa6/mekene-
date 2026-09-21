import { db } from '@/lib/db';
import { paginated, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  formatZodErrors,
  leaderListSchema,
  leaderWriteSchema,
} from '@/lib/admin/validation';
import { slugify } from '@/lib/admin/slug';

const leaderInclude = { position: { select: { id: true, title: true } } } as const;

function serialize(leader: {
  id: string;
  firstName: string;
  lastName: string;
  slug?: string | null;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  isActive: boolean;
  sortOrder: number;
  positionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  position?: { id: string; title: string } | null;
}) {
  return {
    id: leader.id,
    firstName: leader.firstName,
    lastName: leader.lastName,
    slug: leader.slug || null,
    title: leader.title,
    bio: leader.bio,
    photoUrl: leader.photoUrl,
    email: leader.email,
    phone: leader.phone,
    status: leader.status,
    isActive: leader.isActive,
    sortOrder: leader.sortOrder,
    positionId: leader.positionId,
    position: leader.position ?? null,
    createdAt: leader.createdAt.toISOString(),
    updatedAt: leader.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'leadership', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = leaderListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
    status: url.searchParams.get('status') || undefined,
    active: url.searchParams.get('active') || undefined,
    positionId: url.searchParams.get('positionId') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, sort, dir, status, active, positionId } = parsed.data;
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { title: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;
  if (positionId) where.positionId = positionId;

  const orderField = ['lastName', 'createdAt', 'status', 'sortOrder'].includes(sort || '')
    ? (sort as 'lastName' | 'createdAt' | 'status' | 'sortOrder')
    : 'sortOrder';

  const [totalItems, leaders] = await Promise.all([
    db.leader.count({ where }),
    db.leader.findMany({
      where,
      include: leaderInclude,
      orderBy: [{ [orderField]: dir === 'desc' ? 'desc' : 'asc' }, { lastName: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(leaders.map(serialize), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'leadership', 'create');
  if (!auth.ok) return auth.error;

  const parsed = leaderWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const data = parsed.data;
  const baseSlug =
    data.slug || slugify(`${data.firstName} ${data.lastName}`) || `leader-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 0;
  while (await db.leader.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
  const leader = await db.leader.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      slug,
      title: data.title ?? null,
      bio: data.bio ?? null,
      photoUrl: data.photoUrl || null,
      email: data.email || null,
      phone: data.phone ?? null,
      status: data.status || 'draft',
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      positionId: data.positionId ?? null,
    },
    include: leaderInclude,
  });

  await logSecurityEvent({
    action: 'create',
    entity: 'leader',
    entityId: leader.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { name: `${leader.firstName} ${leader.lastName}` },
  });

  return success(serialize(leader), 'Leader created.', 201);
}
