import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { assignmentInclude, serializeAssignment } from '@/lib/volunteers/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) {
    return success({ assignments: [] });
  }

  const status = new URL(request.url).searchParams.get('status') || undefined;

  const rows = await db.serviceAssignment.findMany({
    where: {
      memberId: member.id,
      ...(status ? { status: status as never } : {}),
    },
    include: assignmentInclude,
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });

  return success({
    assignments: rows.map(serializeAssignment),
  });
}
