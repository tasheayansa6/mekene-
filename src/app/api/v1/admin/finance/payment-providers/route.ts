import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManagePayments, canViewGiving } from '@/lib/giving/access';
import { hasPermission } from '@/lib/auth/permissions';
import { providerConfigPatchSchema } from '@/lib/giving/validation';
import {
  listProviderConfigsSafe,
  serializeProviderConfig,
  updateProviderConfig,
} from '@/lib/giving/provider-config';
import { emitGivingEvent } from '@/lib/giving/events';
import { getConfiguredProviderId } from '@/lib/giving/providers';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user) && !hasPermission(auth.user, 'finance', 'view')) {
    return forbidden();
  }

  const providers = await listProviderConfigsSafe();
  return success({
    providers,
    activeProviderKey: getConfiguredProviderId(),
    note: 'Secret keys are never returned. Configure secrets via environment variables only.',
  });
}

export async function PATCH(request: Request) {
  const auth = await guardAdminWrite(request, 'finance', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManagePayments(auth.user) && !hasPermission(auth.user, 'finance', 'manage')) {
    return forbidden();
  }

  const body = (await readJson(request)) as { providerKey?: string } & Record<string, unknown>;
  if (!body.providerKey) return error('providerKey is required.', 400);
  const { providerKey, ...rest } = body;
  const parsed = providerConfigPatchSchema.safeParse(rest);
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const updated = await updateProviderConfig(providerKey, parsed.data);
    await emitGivingEvent({
      type: 'giving.provider_config_updated',
      entityId: updated.id,
      userId: auth.user.id,
      request,
      details: { providerKey: updated.providerKey, isEnabled: updated.isEnabled },
    });
    return success({ provider: serializeProviderConfig(updated) }, 'Provider configuration updated.');
  } catch {
    return error('Provider not found.', 404);
  }
}
