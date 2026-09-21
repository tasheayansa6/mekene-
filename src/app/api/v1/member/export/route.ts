import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/authorize';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { exportMemberData } from '@/lib/member-portal/export';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const payload = await exportMemberData(auth.user);
  await logSecurityEvent({
    action: 'member.data_exported',
    entity: 'user',
    entityId: auth.user.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="my-church-data.json"',
      'Cache-Control': 'private, no-store',
    },
  });
}
