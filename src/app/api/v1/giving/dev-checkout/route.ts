import { createHmac } from 'crypto';
import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { tooManyRequests } from '@/lib/api/response';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';
import { processVerifiedWebhook } from '@/lib/giving/write';
import { moneyToString } from '@/lib/giving/money';

const schema = z.object({
  reference: z.string().trim().min(4).max(80),
  outcome: z.enum(['successful', 'failed', 'cancelled']),
});

/**
 * Development-only simulator: posts a signed webhook to the verified pipeline.
 * Production merchant checkouts must use real provider webhooks — never trust the browser alone.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_CHECKOUT !== 'true') {
    return error('Development checkout simulator is disabled.', 403);
  }

  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const limited = rateLimitKey(`dev-checkout:${getClientIp(request)}`, 30, 60_000);
  if (!limited.allowed) {
    return tooManyRequests('Too many checkout attempts.', limited.retryAfterSeconds);
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!secret) return error('PAYMENT_WEBHOOK_SECRET is not configured.', 400);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const contribution = await db.contribution.findUnique({
    where: { reference: parsed.data.reference },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!contribution) return error('Contribution not found.', 404);
  if (contribution.status === 'successful' || contribution.status === 'partially_refunded') {
    return success({ contributionId: contribution.id, status: contribution.status }, 'Already confirmed.');
  }

  const txn = contribution.transactions[0];
  const providerReference = txn?.providerReference || `dev_${contribution.reference}`;
  const payload = {
    event_id: `dev_sim_${contribution.reference}_${parsed.data.outcome}`,
    provider_reference: providerReference,
    contribution_reference: contribution.reference,
    amount: moneyToString(contribution.amount),
    currency: contribution.currency,
    status: parsed.data.outcome,
  };
  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

  const webhookRequest = new Request('http://localhost/api/v1/payments/webhook/signed_dev', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bme-signature': signature,
    },
    body: rawBody,
  });

  const result = await processVerifiedWebhook({
    provider: 'signed_dev',
    event: {
      eventKey: payload.event_id,
      providerReference,
      contributionReference: contribution.reference,
      amount: payload.amount,
      currency: payload.currency,
      status: parsed.data.outcome,
      summary: `dev_sim:${parsed.data.outcome}`,
    },
    request: webhookRequest,
  });

  if (!result.ok) return error(result.error, 400);

  const refreshed = await db.contribution.findUnique({ where: { id: contribution.id } });
  return success({
    contributionId: contribution.id,
    reference: contribution.reference,
    status: refreshed?.status || parsed.data.outcome,
  });
}
