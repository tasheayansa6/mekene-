import { hasPermission, type AuthUser } from '@/lib/auth/permissions';

export function canViewCommunications(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'view') || hasPermission(user, 'communications', 'manage');
}

export function canCreateCommunications(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'create') || hasPermission(user, 'communications', 'manage');
}

export function canUpdateCommunications(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'update') || hasPermission(user, 'communications', 'manage');
}

export function canPublishCommunications(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'publish') || hasPermission(user, 'communications', 'manage');
}

/** schedule / send → assign */
export function canSendCommunications(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'assign') || hasPermission(user, 'communications', 'manage');
}

/** send_bulk / manage_integrations → manage */
export function canSendBulkCommunications(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'manage');
}

/** manage_templates → moderate */
export function canManageTemplates(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'moderate') || hasPermission(user, 'communications', 'manage');
}

export function canManageIntegrations(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'manage');
}

export function isMinistryScopedCommunicator(user: AuthUser): boolean {
  return user.role.slug === 'ministry_leader' && !hasPermission(user, 'communications', 'manage');
}

export function canSendEmergency(user: AuthUser): boolean {
  return hasPermission(user, 'communications', 'manage');
}

export function canModerateMessages(user: AuthUser): boolean {
  return (
    hasPermission(user, 'communications', 'moderate') ||
    hasPermission(user, 'communications', 'manage')
  );
}

export function canAccessStaffInbox(user: AuthUser): boolean {
  return (
    hasPermission(user, 'communications', 'view') ||
    hasPermission(user, 'communications', 'assign') ||
    hasPermission(user, 'communications', 'manage') ||
    hasPermission(user, 'pastoral', 'view')
  );
}

/** API layer still enforces active member status. */
export function canStartSupportConversation(_user: AuthUser): boolean {
  return true;
}
