import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { applicantStatusLabel } from '@/lib/members/status';
import { applicationSelfInclude, serializeApplicationApplicant } from '@/lib/members/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const [member, application] = await Promise.all([
    db.member.findUnique({
      where: { userId: auth.user.id },
      select: {
        id: true,
        membershipNumber: true,
        status: true,
        dateJoined: true,
        createdAt: true,
      },
    }),
    db.membershipApplication.findFirst({
      where: { userId: auth.user.id },
      orderBy: { submittedAt: 'desc' },
      include: applicationSelfInclude,
    }),
  ]);

  return success({
    member: member
      ? {
          status: member.status,
          membershipNumber: member.membershipNumber,
          dateJoined: member.dateJoined?.toISOString() ?? null,
        }
      : null,
    application: application ? serializeApplicationApplicant(application) : null,
    applicationStatus: application ? applicantStatusLabel(application.status) : null,
  });
}
