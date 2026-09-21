import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { serializePolicy } from '@/lib/governance/serialize';
import { uniquePolicySlug } from '@/lib/governance/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;

  const where = status ? { status: status as never } : {};

  const [totalItems, rows] = await Promise.all([
    db.governancePolicy.count({ where }),
    db.governancePolicy.findMany({
      where,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, status: true, publishedAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializePolicy), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageGovernance(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required.');
  }
  if (typeof body.body !== 'string') {
    return badRequest('body is required for the initial policy version.');
  }

  const slug = await uniquePolicySlug(body.title);
  const row = await db.governancePolicy.create({
    data: {
      title: body.title.trim(),
      slug,
      description: typeof body.description === 'string' ? body.description : null,
      committeeId: typeof body.committeeId === 'string' ? body.committeeId : null,
      requireAck: body.requireAck === true,
      authorId: auth.user.id,
      status: 'draft',
      versions: {
        create: {
          version: 1,
          body: body.body,
          status: 'draft',
          authorId: auth.user.id,
        },
      },
    },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        select: { id: true, version: true, status: true, publishedAt: true },
      },
    },
  });

  return success(serializePolicy(row), 'Policy created.', 201);
}
