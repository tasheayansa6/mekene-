import { forbidden } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canViewLiveAdmin, canWriteLiveAdmin } from './access';

export async function guardLiveAdminRead(request: Request) {
  let auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) {
    auth = await guardAdminRead(request, 'media', 'view');
  }
  if (!auth.ok) return auth;
  if (!canViewLiveAdmin(auth.user)) {
    return { ok: false as const, error: forbidden() };
  }
  return auth;
}

export async function guardLiveAdminWrite(
  request: Request,
  action: 'create' | 'update' | 'manage' | 'moderate' = 'manage'
) {
  const permAction = action === 'moderate' ? 'moderate' : action === 'create' ? 'create' : 'update';
  let auth = await guardAdminWrite(request, 'events', permAction);
  if (!auth.ok && action === 'moderate') {
    auth = await guardAdminWrite(request, 'events', 'manage');
  }
  if (!auth.ok && permAction === 'update') {
    auth = await guardAdminWrite(request, 'events', 'manage');
  }
  if (!auth.ok) return auth;
  if (!canWriteLiveAdmin(auth.user)) {
    return { ok: false as const, error: forbidden() };
  }
  return auth;
}
