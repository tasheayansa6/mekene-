import { hasPermission, type AuthUser } from '@/lib/auth/permissions';

export type CommitteeScope = {
  id: string;
  chairUserId?: string | null;
  secretaryUserId?: string | null;
  ministryId?: string | null;
};

export type MeetingScope = {
  id: string;
  chairUserId?: string | null;
  secretaryUserId?: string | null;
  committeeId?: string | null;
  committee?: CommitteeScope | null;
};

export function canViewGovernance(user: AuthUser): boolean {
  return (
    hasPermission(user, 'governance', 'view') ||
    hasPermission(user, 'governance', 'manage') ||
    hasPermission(user, 'leadership', 'view')
  );
}

export function canManageGovernance(user: AuthUser): boolean {
  return (
    hasPermission(user, 'governance', 'manage') ||
    hasPermission(user, 'governance', 'create') ||
    hasPermission(user, 'governance', 'update')
  );
}

export function canApproveGovernance(user: AuthUser): boolean {
  return (
    hasPermission(user, 'governance', 'approve') ||
    hasPermission(user, 'governance', 'manage')
  );
}

export function canAssignGovernance(user: AuthUser): boolean {
  return (
    hasPermission(user, 'governance', 'assign') ||
    hasPermission(user, 'governance', 'manage')
  );
}

export function canViewReports(user: AuthUser): boolean {
  return (
    hasPermission(user, 'governance', 'view') ||
    hasPermission(user, 'governance', 'export') ||
    hasPermission(user, 'governance', 'manage')
  );
}

export function isGlobalGovernanceAdmin(user: AuthUser): boolean {
  return (
    hasPermission(user, 'governance', 'manage') ||
    user.role.slug === 'super_admin' ||
    user.role.slug === 'admin'
  );
}

/** Object-level committee access — never trust client committee_id alone. */
export function canViewCommittee(
  user: AuthUser,
  committee: CommitteeScope,
  opts?: { isActiveMember?: boolean; adminListScope?: boolean }
): boolean {
  if (isGlobalGovernanceAdmin(user)) return true;
  if (hasPermission(user, 'governance', 'manage')) return true;
  if (committee.chairUserId === user.id || committee.secretaryUserId === user.id) {
    return true;
  }
  if (opts?.isActiveMember) return true;
  // Church-wide governance viewers (pastor/admin portal) — not mere members.
  if (opts?.adminListScope && hasPermission(user, 'governance', 'view')) {
    return true;
  }
  return false;
}

export function canManageCommittee(
  user: AuthUser,
  committee: CommitteeScope
): boolean {
  if (isGlobalGovernanceAdmin(user)) return true;
  if (hasPermission(user, 'governance', 'manage')) return true;
  if (committee.chairUserId === user.id && canManageGovernance(user)) return true;
  return false;
}

export function canViewMeeting(
  user: AuthUser,
  meeting: MeetingScope,
  opts?: { isParticipant?: boolean; isCommitteeMember?: boolean }
): boolean {
  if (isGlobalGovernanceAdmin(user)) return true;
  if (meeting.chairUserId === user.id || meeting.secretaryUserId === user.id) return true;
  if (meeting.committee && canViewCommittee(user, meeting.committee, {
    isActiveMember: opts?.isCommitteeMember,
  })) {
    return true;
  }
  if (opts?.isParticipant && canViewGovernance(user)) return true;
  return canViewGovernance(user) && !meeting.committeeId;
}

export function canManageMeeting(user: AuthUser, meeting: MeetingScope): boolean {
  if (isGlobalGovernanceAdmin(user)) return true;
  if (meeting.chairUserId === user.id || meeting.secretaryUserId === user.id) {
    return canManageGovernance(user) || canApproveGovernance(user);
  }
  if (meeting.committee && canManageCommittee(user, meeting.committee)) return true;
  return hasPermission(user, 'governance', 'manage');
}

export function canAccessOwnRequest(user: AuthUser, requestMemberUserId: string | null | undefined, requestMemberId: string, userMemberId: string | null): boolean {
  if (isGlobalGovernanceAdmin(user) || canManageGovernance(user)) return true;
  if (userMemberId && userMemberId === requestMemberId) return true;
  if (requestMemberUserId && requestMemberUserId === user.id) return true;
  return false;
}

export function canViewInternalRequestNotes(user: AuthUser): boolean {
  return canManageGovernance(user) || canAssignGovernance(user) || isGlobalGovernanceAdmin(user);
}

export function canAccessDocument(
  user: AuthUser,
  doc: {
    accessLevel: string;
    committeeId?: string | null;
    uploadedById?: string | null;
  },
  opts?: { isCommitteeMember?: boolean; isMember?: boolean }
): boolean {
  if (doc.accessLevel === 'public') return true;
  if (doc.uploadedById === user.id) return true;
  if (isGlobalGovernanceAdmin(user)) return true;

  switch (doc.accessLevel) {
    case 'member_only':
      return Boolean(opts?.isMember) || canViewGovernance(user);
    case 'leadership_only':
      return canViewGovernance(user);
    case 'committee_only':
      return Boolean(opts?.isCommitteeMember) || isGlobalGovernanceAdmin(user);
    case 'restricted':
    default:
      return isGlobalGovernanceAdmin(user) || hasPermission(user, 'governance', 'manage');
  }
}
