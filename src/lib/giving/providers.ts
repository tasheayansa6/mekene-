import { createHmac, timingSafeEqual } from 'crypto';
import type { Decimal } from '@prisma/client/runtime/library';
import { getAppUrl } from '@/lib/auth/config';

export type ProviderCheckoutResult =
  | {
      ok: true;
      mode: 'redirect' | 'instructions' | 'pending_config';
      provider: string;
      providerReference: string | null;
      redirectUrl?: string | null;
      message: string;
    }
  | { ok: false; error: string; code: 'not_configured' | 'unsupported' | 'invalid' };

export type VerifiedWebhookEvent = {
  eventKey: string;
  providerReference: string;
  contributionReference?: string | null;
  amount: string;
  currency: string;
  status: 'successful' | 'failed' | 'cancelled' | 'processing';
  summary: string;
};

export interface PaymentProvider {
  id: string;
  displayName: string;
  supportsOnlineCheckout: boolean;
  supportsRecurring: boolean;
  createCheckout(input: {
    contributionId: string;
    reference: string;
    amount: Decimal;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<ProviderCheckoutResult>;
  verifyWebhook(request: Request, rawBody: string): Promise<VerifiedWebhookEvent | null>;
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getConfiguredProviderId(): string {
  return (env('PAYMENT_PROVIDER') || 'manual').toLowerCase();
}

/** Offline / staff-recorded contributions. Never processes card data. */
export const manualProvider: PaymentProvider = {
  id: 'manual',
  displayName: 'Manual / Offline',
  supportsOnlineCheckout: false,
  supportsRecurring: false,
  async createCheckout() {
    return {
      ok: false,
      code: 'unsupported',
      error: 'Online checkout is not available for the manual provider. Record an offline contribution instead.',
    };
  },
  async verifyWebhook() {
    return null;
  },
};

/**
 * Dev/HMAC webhook adapter for local reconciliation tests.
 * Does not invent a commercial Ethiopia API — verifies a church-controlled HMAC signature.
 * Env: PAYMENT_WEBHOOK_SECRET
 */
export const signedDevProvider: PaymentProvider = {
  id: 'signed_dev',
  displayName: 'Signed development webhook',
  supportsOnlineCheckout: Boolean(env('PAYMENT_WEBHOOK_SECRET')),
  supportsRecurring: false,
  async createCheckout(input) {
    const secret = env('PAYMENT_WEBHOOK_SECRET');
    if (!secret) {
      return {
        ok: true,
        mode: 'pending_config',
        provider: 'signed_dev',
        providerReference: null,
        message:
          'Set PAYMENT_WEBHOOK_SECRET to enable the signed development checkout simulator. Live merchant APIs are not invented here.',
      };
    }
    const providerReference = `dev_${input.reference}`;
    return {
      ok: true,
      mode: 'redirect',
      provider: 'signed_dev',
      providerReference,
      redirectUrl: `${getAppUrl()}/give/checkout/dev?ref=${encodeURIComponent(input.reference)}`,
      message: 'Continue to the secure development checkout simulator.',
    };
  },
  async verifyWebhook(request, rawBody) {
    const secret = env('PAYMENT_WEBHOOK_SECRET');
    if (!secret) return null;
    const signature = request.headers.get('x-bme-signature') || '';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    let payload: {
      event_id?: string;
      provider_reference?: string;
      contribution_reference?: string;
      amount?: string;
      currency?: string;
      status?: string;
    };
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      return null;
    }
    if (!payload.event_id || !payload.provider_reference || !payload.amount || !payload.currency) {
      return null;
    }
    const status = payload.status;
    if (
      status !== 'successful' &&
      status !== 'failed' &&
      status !== 'cancelled' &&
      status !== 'processing'
    ) {
      return null;
    }
    return {
      eventKey: payload.event_id,
      providerReference: payload.provider_reference,
      contributionReference: payload.contribution_reference || null,
      amount: payload.amount,
      currency: payload.currency.toUpperCase(),
      status,
      summary: `signed_dev:${status}`,
    };
  },
};

/**
 * Placeholder for an Ethiopia merchant provider.
 * Credentials may be present in env, but checkout is not invented without official API docs.
 */
export const ethiopiaReadyProvider: PaymentProvider = {
  id: 'ethiopia_ready',
  displayName: 'Ethiopia provider (awaiting merchant API wiring)',
  supportsOnlineCheckout: false,
  supportsRecurring: false,
  async createCheckout() {
    const hasKeys = Boolean(env('PAYMENT_MERCHANT_ID') && env('PAYMENT_API_KEY'));
    return {
      ok: true,
      mode: 'pending_config',
      provider: 'ethiopia_ready',
      providerReference: null,
      message: hasKeys
        ? 'Merchant credentials are present, but the official provider API adapter is not wired yet. Contributions stay pending until staff confirm or a verified webhook arrives.'
        : 'Online payments are not configured. Set PAYMENT_PROVIDER and merchant credentials after reviewing the official provider documentation.',
    };
  },
  async verifyWebhook(request, rawBody) {
    // Signature verification will be implemented against the chosen provider's official docs.
    // Until then, reject all webhooks for this provider id.
    void request;
    void rawBody;
    return null;
  },
};

const registry: Record<string, PaymentProvider> = {
  manual: manualProvider,
  signed_dev: signedDevProvider,
  ethiopia_ready: ethiopiaReadyProvider,
  // Aliases reserved for future adapters (do not invent APIs here)
  chapa: ethiopiaReadyProvider,
  telebirr: ethiopiaReadyProvider,
};

export function getPaymentProvider(providerId = getConfiguredProviderId()): PaymentProvider {
  return registry[providerId] || manualProvider;
}

export function listPaymentProviders(): Array<{ id: string; displayName: string }> {
  return [
    { id: 'manual', displayName: manualProvider.displayName },
    { id: 'signed_dev', displayName: signedDevProvider.displayName },
    { id: 'ethiopia_ready', displayName: ethiopiaReadyProvider.displayName },
  ];
}
