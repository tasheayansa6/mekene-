import { hasPermission, type AuthUser } from '@/lib/auth/permissions';
import type { Prisma } from '@prisma/client';

export function canViewAttendance(user: AuthUser): boolean {
  return hasPermission(user, 'attendance', 'view') || hasPermission(user, 'attendance', 'manage');
}

export function canCreateAttendance(user: AuthUser): boolean {
  return hasPermission(user, 'attendance', 'create') || hasPermission(user, 'attendance', 'manage');
}

export function canUpdateAttendance(user: AuthUser): boolean {
  return hasPermission(user, 'attendance', 'update') || hasPermission(user, 'attendance', 'manage');
}

export function canCorrectAttendance(user: AuthUser): boolean {
  return hasPermission(user, 'attendance', 'moderate') || hasPermission(user, 'attendance', 'manage');
}

export function canArchiveAttendance(user: AuthUser): boolean {
  return hasPermission(user, 'attendance', 'archive') || hasPermission(user, 'attendance', 'manage');
}

export function canManageQr(user: AuthUser): boolean {
  return hasPermission(user, 'attendance', 'assign') || hasPermission(user, 'attendance', 'manage');
}

export function canExportAttendance(user: AuthUser): boolean {
  return hasPermission(user, 'attendance', 'manage');
}

export function isAttendanceMinistryScope(user: AuthUser): boolean {
  return user.role.slug === 'ministry_leader' && !hasPermission(user, 'attendance', 'manage');
}

/** Ministry leaders only see sessions for ministries they lead. */
export function sessionListWhere(user: AuthUser): Prisma.AttendanceSessionWhereInput {
  if (!isAttendanceMinistryScope(user)) return {};
  return { ministry: { leaderUserId: user.id } };
}

export function sessionByIdWhere(user: AuthUser, id: string): Prisma.AttendanceSessionWhereInput {
  return { id, ...sessionListWhere(user) };
}
