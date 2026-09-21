import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getMemberByUserId } from '@/lib/education/enrollment';
import { serializeCertificate } from '@/lib/education/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await getMemberByUserId(auth.user.id);
  if (!member) return forbidden('A member profile is required.');

  const rows = await db.educationCertificate.findMany({
    where: { memberId: member.id, status: 'issued' },
    orderBy: { issuedAt: 'desc' },
  });

  return success({ certificates: rows.map(serializeCertificate) });
}
