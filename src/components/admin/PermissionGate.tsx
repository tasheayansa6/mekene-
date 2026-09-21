'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { PermissionDenied } from '@/components/admin/PermissionDenied';

export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) return <PermissionDenied />;
  return <>{children}</>;
}
