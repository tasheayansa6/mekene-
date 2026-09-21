import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/auth/permissions';
import { isCurrentMember, isOpenApplication } from './status';
import { nextMembershipNumber } from './number';

export async function findOpenApplication(userId: string) {
  return db.membershipApplication.findFirst({
    where: {
      userId,
      status: { in: ['submitted', 'under_review', 'needs_information', 'resubmitted'] },
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findCurrentMembership(userId: string) {
  return db.member.findUnique({
    where: { userId },
  });
}

export async function assertCanApply(userId: string): Promise<
  | { ok: true }
  | { ok: false; message: string; status: number }
> {
  const member = await findCurrentMembership(userId);
  if (member && isCurrentMember(member.status)) {
    return {
      ok: false,
      message: 'You already have a church membership record.',
      status: 409,
    };
  }

  const open = await findOpenApplication(userId);
  if (open && isOpenApplication(open.status)) {
    return {
      ok: false,
      message: 'You already have a membership application in progress.',
      status: 409,
    };
  }

  return { ok: true };
}

export async function recordStatusHistory(input: {
  memberId?: string | null;
  applicationId?: string | null;
  oldStatus?: string | null;
  newStatus: string;
  changedById?: string | null;
  reason?: string | null;
}) {
  await db.membershipStatusHistory.create({
    data: {
      memberId: input.memberId ?? null,
      applicationId: input.applicationId ?? null,
      oldStatus: input.oldStatus ?? null,
      newStatus: input.newStatus,
      changedById: input.changedById ?? null,
      reason: input.reason ?? null,
    },
  });
}

export async function activateMemberFromApplication(input: {
  userId: string;
  preferredLanguage: string;
}) {
  const existing = await db.member.findUnique({ where: { userId: input.userId } });
  if (existing) {
    const membershipNumber = existing.membershipNumber || (await nextMembershipNumber());
    return db.member.update({
      where: { id: existing.id },
      data: {
        status: 'active',
        dateJoined: existing.dateJoined ?? new Date(),
        membershipNumber,
        preferredLanguage: input.preferredLanguage || existing.preferredLanguage,
      },
    });
  }

  return db.member.create({
    data: {
      userId: input.userId,
      status: 'active',
      dateJoined: new Date(),
      membershipNumber: await nextMembershipNumber(),
      preferredLanguage: input.preferredLanguage || 'en',
      directoryVisibility: 'private',
    },
  });
}

export function actorName(user: AuthUser) {
  return `${user.firstName} ${user.lastName}`.trim();
}
