import { unauthorized, forbidden } from '@/lib/api/response';

type AdminAuthResult =
  | { ok: true }
  | { ok: false; error: ReturnType<typeof unauthorized> | ReturnType<typeof forbidden> };

export function checkAdminAuth(request: Request): AdminAuthResult {
  const key = request.headers.get('x-admin-key');
  if (!key) return { ok: false, error: unauthorized() };
  if (key !== 'demo-admin') return { ok: false, error: forbidden() };
  return { ok: true };
}
