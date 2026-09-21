import { hasPermission, type AuthUser } from '@/lib/auth/permissions';

export function canViewEducation(user: AuthUser): boolean {
  return hasPermission(user, 'education', 'view') || hasPermission(user, 'education', 'manage');
}

export function canManageEducation(user: AuthUser): boolean {
  return hasPermission(user, 'education', 'manage');
}

export function canCreateEducation(user: AuthUser): boolean {
  return hasPermission(user, 'education', 'create') || hasPermission(user, 'education', 'manage');
}

export function canUpdateEducation(user: AuthUser): boolean {
  return hasPermission(user, 'education', 'update') || hasPermission(user, 'education', 'manage');
}

export function canPublishEducation(user: AuthUser): boolean {
  return hasPermission(user, 'education', 'publish') || hasPermission(user, 'education', 'manage');
}

export function canApproveEnrollment(user: AuthUser): boolean {
  return hasPermission(user, 'education', 'approve') || hasPermission(user, 'education', 'manage');
}

export function canAssignEducation(user: AuthUser): boolean {
  return hasPermission(user, 'education', 'assign') || hasPermission(user, 'education', 'manage');
}

/** Instructor for a course, or staff with education update/manage. */
export function canInstructCourse(user: AuthUser, instructorUserId: string | null | undefined): boolean {
  if (instructorUserId && instructorUserId === user.id) return true;
  return canUpdateEducation(user);
}

export const ACTIVE_ENROLLMENT_STATUSES = [
  'approved',
  'enrolled',
  'active',
  'completed',
] as const;

export function isActiveEnrollmentStatus(status: string): boolean {
  return (ACTIVE_ENROLLMENT_STATUSES as readonly string[]).includes(status);
}
