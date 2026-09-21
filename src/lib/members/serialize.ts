import {
  adminApplicationLabel,
  adminMemberStatusLabel,
  applicantStatusLabel,
} from './status';

const userPublicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profileImage: true,
} as const;

export const memberAdminInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      profileImage: true,
      status: true,
      isVerified: true,
      createdAt: true,
      role: { select: { slug: true, name: true } },
    },
  },
  household: { select: { id: true, name: true, primaryMemberId: true } },
  ministries: {
    include: {
      ministry: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  applications: {
    orderBy: { submittedAt: 'desc' as const },
    take: 20,
    select: {
      id: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    take: 40,
    include: {
      changedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

export const memberSelfInclude = {
  household: { select: { id: true, name: true } },
  ministries: {
    include: {
      ministry: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

export const applicationAdminInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      profileImage: true,
      status: true,
    },
  },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, membershipNumber: true, status: true } },
  history: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      changedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

export const applicationSelfInclude = {
  member: { select: { id: true, membershipNumber: true, status: true, dateJoined: true } },
} as const;

type MemberRow = {
  id: string;
  membershipNumber: string | null;
  displayName: string | null;
  preferredLanguage: string;
  status: string;
  dateJoined: Date | null;
  householdId: string | null;
  directoryVisibility: string;
  showProfilePhoto: boolean;
  showDisplayName: boolean;
  showMinistry: boolean;
  showContactButton?: boolean;
  createdAt: Date;
  updatedAt: Date;
  household?: { id: string; name: string } | null;
  ministries?: Array<{
    id: string;
    roleLabel: string | null;
    status: string;
    joinedAt: Date | null;
    ministry: { id: string; name: string; slug: string };
  }>;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string;
    profileImage?: string | null;
    status?: string;
    isVerified?: boolean;
    createdAt?: Date;
    role?: { slug: string; name: string };
  };
  applications?: Array<{
    id: string;
    status: string;
    submittedAt: Date;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  statusHistory?: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: Date;
    changedBy?: { id: string; firstName: string; lastName: string } | null;
  }>;
};

function displayNameFor(row: MemberRow) {
  if (row.displayName?.trim()) return row.displayName.trim();
  if (row.user) return `${row.user.firstName} ${row.user.lastName}`.trim();
  return 'Member';
}

export function serializeMemberSelf(row: MemberRow, user: {
  firstName: string;
  lastName: string;
  phone: string | null;
  profileImage: string | null;
  email: string;
}) {
  return {
    id: row.id,
    membershipNumber: row.membershipNumber,
    displayName: displayNameFor({ ...row, user: { id: '', firstName: user.firstName, lastName: user.lastName } }),
    preferredLanguage: row.preferredLanguage,
    status: row.status,
    statusLabel: adminMemberStatusLabel(row.status),
    dateJoined: row.dateJoined?.toISOString() ?? null,
    directoryVisibility: row.directoryVisibility,
    showProfilePhoto: row.showProfilePhoto,
    showDisplayName: row.showDisplayName,
    showMinistry: row.showMinistry,
    showContactButton: row.showContactButton ?? false,
    household: row.household ? { id: row.household.id, name: row.household.name } : null,
    ministries: (row.ministries || []).map((item) => ({
      id: item.id,
      roleLabel: item.roleLabel,
      status: item.status,
      joinedAt: item.joinedAt?.toISOString() ?? null,
      ministry: item.ministry,
    })),
    account: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profileImage: user.profileImage,
      email: user.email,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeMemberList(row: MemberRow) {
  return {
    id: row.id,
    membershipNumber: row.membershipNumber,
    displayName: displayNameFor(row),
    status: row.status,
    statusLabel: adminMemberStatusLabel(row.status),
    household: row.household ? { id: row.household.id, name: row.household.name } : null,
    dateJoined: row.dateJoined?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeMemberAdmin(row: MemberRow) {
  return {
    ...serializeMemberList(row),
    preferredLanguage: row.preferredLanguage,
    directoryVisibility: row.directoryVisibility,
    showProfilePhoto: row.showProfilePhoto,
    showDisplayName: row.showDisplayName,
    showMinistry: row.showMinistry,
    ministries: (row.ministries || []).map((item) => ({
      id: item.id,
      roleLabel: item.roleLabel,
      status: item.status,
      joinedAt: item.joinedAt?.toISOString() ?? null,
      ministry: item.ministry,
    })),
    applications: (row.applications || []).map((item) => ({
      id: item.id,
      status: item.status,
      statusLabel: adminApplicationLabel(item.status),
      submittedAt: item.submittedAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
    })),
    history: (row.statusHistory || []).map((item) => ({
      id: item.id,
      oldStatus: item.oldStatus,
      newStatus: item.newStatus,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      changedBy: item.changedBy
        ? { id: item.changedBy.id, name: `${item.changedBy.firstName} ${item.changedBy.lastName}`.trim() }
        : null,
    })),
    account: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          phone: row.user.phone ?? null,
          profileImage: row.user.profileImage ?? null,
          status: row.user.status,
          isVerified: row.user.isVerified,
          role: row.user.role ?? null,
          createdAt: row.user.createdAt?.toISOString() ?? null,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

type ApplicationRow = {
  id: string;
  userId: string;
  memberId: string | null;
  status: string;
  fullName: string;
  preferredContact: string | null;
  preferredLanguage: string;
  howHeard: string | null;
  ministryInterests: string | null;
  applicantNote: string | null;
  reviewerMessage: string | null;
  reviewNotes?: string | null;
  reviewedById?: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email?: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  };
  reviewedBy?: { id: string; firstName: string; lastName: string } | null;
  member?: { id: string; membershipNumber: string | null; status: string; dateJoined?: Date | null } | null;
  history?: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: Date;
    changedBy?: { id: string; firstName: string; lastName: string } | null;
  }>;
};

export function serializeApplicationApplicant(row: ApplicationRow) {
  const publicCode =
    row.status === 'resubmitted'
      ? 'submitted'
      : row.status === 'archived'
        ? 'rejected'
        : row.status;

  return {
    id: row.id,
    status: applicantStatusLabel(row.status),
    statusCode: publicCode,
    fullName: row.fullName,
    preferredContact: row.preferredContact,
    preferredLanguage: row.preferredLanguage,
    howHeard: row.howHeard,
    ministryInterests: row.ministryInterests,
    applicantNote: row.applicantNote,
    reviewerMessage: row.status === 'needs_information' ? row.reviewerMessage : null,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt:
      row.status === 'approved' || row.status === 'rejected'
        ? row.reviewedAt?.toISOString() ?? null
        : null,
    updatedAt: row.updatedAt.toISOString(),
    membership: row.member
      ? {
          status: row.member.status,
          membershipNumber: row.member.membershipNumber,
          dateJoined: row.member.dateJoined?.toISOString() ?? null,
        }
      : null,
  };
}

export function serializeApplicationAdminList(row: ApplicationRow) {
  return {
    id: row.id,
    applicant: {
      id: row.user?.id ?? row.userId,
      name: row.fullName,
    },
    submittedAt: row.submittedAt.toISOString(),
    status: row.status,
    statusLabel: adminApplicationLabel(row.status),
    reviewedBy: row.reviewedBy
      ? { id: row.reviewedBy.id, name: `${row.reviewedBy.firstName} ${row.reviewedBy.lastName}`.trim() }
      : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeApplicationAdmin(row: ApplicationRow) {
  return {
    ...serializeApplicationAdminList(row),
    fullName: row.fullName,
    preferredContact: row.preferredContact,
    preferredLanguage: row.preferredLanguage,
    howHeard: row.howHeard,
    ministryInterests: row.ministryInterests,
    applicantNote: row.applicantNote,
    reviewerMessage: row.reviewerMessage,
    reviewNotes: row.reviewNotes ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    member: row.member
      ? {
          id: row.member.id,
          membershipNumber: row.member.membershipNumber,
          status: row.member.status,
        }
      : null,
    account: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          phone: row.user.phone ?? null,
        }
      : null,
    history: (row.history || []).map((item) => ({
      id: item.id,
      oldStatus: item.oldStatus,
      newStatus: item.newStatus,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      changedBy: item.changedBy
        ? { id: item.changedBy.id, name: `${item.changedBy.firstName} ${item.changedBy.lastName}`.trim() }
        : null,
    })),
  };
}

export { userPublicSelect };
