import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    include: {
      ministries: {
        include: { ministry: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return success({
    ministries: (member?.ministries || []).map((item) => ({
      id: item.id,
      roleLabel: item.roleLabel,
      status: item.status,
      joinedAt: item.joinedAt?.toISOString() ?? null,
      ministry: item.ministry,
    })),
  });
}
