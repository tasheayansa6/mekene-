import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getSessionTokenFromRequest } from '@/lib/auth/cookies';
import { hashToken } from '@/lib/auth/tokens';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const currentHash = getSessionTokenFromRequest(request);
  const current = currentHash ? hashToken(currentHash) : null;

  const rows = await db.session.findMany({
    where: { userId: auth.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      ipAddress: true,
      userAgent: true,
      rememberMe: true,
      tokenHash: true,
    },
  });

  return success({
    sessions: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      rememberMe: row.rememberMe,
      current: current ? row.tokenHash === current : false,
    })),
  });
}
