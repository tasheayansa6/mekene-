import { NextResponse } from 'next/server';
import { error, success } from '@/lib/api/response';
import { getPaymentProvider } from '@/lib/giving/providers';
import { processVerifiedWebhook } from '@/lib/giving/write';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await context.params;
  const providerId = providerParam.toLowerCase();
  const provider = getPaymentProvider(providerId);
  const rawBody = await request.text();

  const verified = await provider.verifyWebhook(request, rawBody);
  if (!verified) {
    await logSecurityEvent({
      action: 'webhook_rejected',
      entity: 'giving',
      ipAddress: getClientIp(request),
      details: { provider: providerId, reason: 'invalid_signature_or_payload' },
    });
    return error('Invalid webhook signature or payload.', 401);
  }

  const result = await processVerifiedWebhook({
    provider: provider.id,
    event: verified,
    request,
  });

  if (!result.ok) {
    return error(result.error, 409);
  }

  return success({ processed: true, duplicate: result.duplicate });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Payment webhook endpoint' });
}
