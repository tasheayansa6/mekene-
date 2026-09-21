import { db } from '@/lib/db';

export type DuplicateCandidate = {
  memberId: string;
  membershipNumber: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  matchReasons: string[];
};

/** Soft duplicate signals — never auto-merge. */
export async function findPossibleDuplicateMembers(input: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: Date | null;
  membershipNumber?: string | null;
  excludeMemberId?: string | null;
}): Promise<DuplicateCandidate[]> {
  const or: object[] = [];
  if (input.email?.trim()) {
    or.push({ user: { email: { equals: input.email.trim().toLowerCase() } } });
  }
  if (input.phone?.trim()) {
    or.push({ user: { phone: input.phone.trim() } });
    or.push({ emergencyContactPhone: input.phone.trim() });
  }
  if (input.membershipNumber?.trim()) {
    or.push({ membershipNumber: input.membershipNumber.trim().toUpperCase() });
  }
  if (input.firstName?.trim() && input.lastName?.trim()) {
    or.push({
      AND: [
        { user: { firstName: { equals: input.firstName.trim() } } },
        { user: { lastName: { equals: input.lastName.trim() } } },
      ],
    });
  }
  if (input.dateOfBirth) {
    or.push({ dateOfBirth: input.dateOfBirth });
  }
  if (!or.length) return [];

  const rows = await db.member.findMany({
    where: {
      OR: or,
      ...(input.excludeMemberId ? { id: { not: input.excludeMemberId } } : {}),
      status: { notIn: ['archived', 'deceased'] },
    },
    include: {
      user: { select: { email: true, phone: true, firstName: true, lastName: true } },
    },
    take: 20,
  });

  return rows.map((row) => {
    const reasons: string[] = [];
    if (input.email && row.user.email?.toLowerCase() === input.email.trim().toLowerCase()) {
      reasons.push('email');
    }
    if (input.phone && (row.user.phone === input.phone.trim() || row.emergencyContactPhone === input.phone.trim())) {
      reasons.push('phone');
    }
    if (
      input.firstName &&
      input.lastName &&
      row.user.firstName.toLowerCase() === input.firstName.trim().toLowerCase() &&
      row.user.lastName.toLowerCase() === input.lastName.trim().toLowerCase()
    ) {
      reasons.push('name');
    }
    if (input.dateOfBirth && row.dateOfBirth?.getTime() === input.dateOfBirth.getTime()) {
      reasons.push('date_of_birth');
    }
    if (input.membershipNumber && row.membershipNumber === input.membershipNumber.trim().toUpperCase()) {
      reasons.push('membership_number');
    }
    return {
      memberId: row.id,
      membershipNumber: row.membershipNumber,
      displayName:
        row.displayName ||
        row.preferredName ||
        `${row.user.firstName} ${row.user.lastName}`.trim(),
      email: row.user.email,
      phone: row.user.phone,
      status: row.status,
      matchReasons: reasons.length ? reasons : ['possible_match'],
    };
  });
}
