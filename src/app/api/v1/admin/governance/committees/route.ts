import { db } from '@/lib/db';
import { badRequest, forbidden, paginated, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canManageGovernance, canViewGovernance } from '@/lib/governance/access';
import { serializeCommittee } from '@/lib/governance/serialize';
import { uniqueCommitteeSlug } from '@/lib/governance/write';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'governance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGovernance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;

  const where = {
    ...(status ? { status: status as 'active' | 'inactive' | 'archived' } : {}),
  };

  const [totalItems, rows] = await Promise.all([
    db.committee.count({ where }),
    db.committee.findMany({
      where,
      include: { _count: { select: { members: true, meetings: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return paginated(rows.map(serializeCommittee), { page, pageSize, totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'create');
  if (!auth.ok) return auth.error;
  if (!canManageGovernance(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return badRequest('name is required.');
  }

  const slug = await uniqueCommitteeSlug(body.name);
  const row = await db.committee.create({
    data: {
      name: body.name.trim(),
      slug,
      description: typeof body.description === 'string' ? body.description : null,
      ministryId: typeof body.ministryId === 'string' ? body.ministryId : null,
      quorumCount: typeof body.quorumCount === 'number' ? body.quorumCount : null,
      quorumPercent: typeof body.quorumPercent === 'number' ? body.quorumPercent : null,
      termMonths: typeof body.termMonths === 'number' ? body.termMonths : null,
      chairUserId: typeof body.chairUserId === 'string' ? body.chairUserId : null,
      secretaryUserId:
        typeof body.secretaryUserId === 'string' ? body.secretaryUserId : null,
    },
    include: { _count: { select: { members: true, meetings: true } } },
  });

  return success(serializeCommittee(row), 'Committee created.', 201);
}
