import { error, success } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { updateDeliveryFromWebhook, verifyWebhookSecret } from '@/lib/communications/webhooks';

export async function POST(request: Request) {
  const verified = verifyWebhookSecret(request, 'EMAIL_WEBHOOK_SECRET');
  if (verified === 'not_configured') {
    return error('Email webhook is not configured.', 503);
  }
  if (verified === 'unauthorized') {
    return error('Unauthorized.', 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await readJson(request)) as Record<string, unknown>;
  } catch {
    return error('Invalid JSON payload.', 400);
  }

  const messageId =
    typeof payload.messageId === 'string'
      ? payload.messageId
      : typeof payload.id === 'string'
        ? payload.id
        : null;
  const providerReference =
    typeof payload.providerReference === 'string' ? payload.providerReference : messageId;
  const status = typeof payload.status === 'string' ? payload.status : null;

  const result = await updateDeliveryFromWebhook({ messageId, providerReference, status });
  return success({ updated: result.updated, deliveryId: 'id' in result ? result.id : null });
}
