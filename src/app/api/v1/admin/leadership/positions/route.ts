import { db } from '@/lib/db';
import { success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors, positionWriteSchema } from '@/lib/admin/validation';

function serialize(position: {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { leaders: number };
}) {
  return {
    id: position.id,
    title: position.title,
    description: position.description,
    sortOrder: position.sortOrder,
    isActive: position.isActive,
    leaderCount: position._count?.leaders ?? 0,
    createdAt: position.createdAt.toISOString(),
    updatedAt: position.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'leadership', 'view');
  if (!auth.ok) return auth.error;

  const positions = await db.leadershipPosition.findMany({
    include: { _count: { select: { leaders: true } } },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });

  return success(positions.map(serialize));
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'leadership', 'create');
  if (!auth.ok) return auth.error;

  const parsed = positionWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const position = await db.leadershipPosition.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
    include: { _count: { select: { leaders: true } } },
  });

  await logSecurityEvent({
    action: 'create',
    entity: 'leadership_position',
    entityId: position.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: { title: position.title },
  });

  return success(serialize(position), 'Position created.', 201);
}
