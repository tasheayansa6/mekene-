import { db } from '@/lib/db';
import { getConfiguredProviderId, listPaymentProviders } from './providers';
import { formatCurrencyList, parseCurrencyList } from './currency';

const DEFAULT_ROWS: Array<{
  providerKey: string;
  displayName: string;
  secretEnvKey: string | null;
  webhookPath: string;
  notes: string;
}> = [
  {
    providerKey: 'manual',
    displayName: 'Manual / Offline',
    secretEnvKey: null,
    webhookPath: '/api/v1/payments/webhook/manual',
    notes: 'Staff-recorded cash and bank transfers. No online checkout.',
  },
  {
    providerKey: 'signed_dev',
    displayName: 'Signed development webhook',
    secretEnvKey: 'PAYMENT_WEBHOOK_SECRET',
    webhookPath: '/api/v1/payments/webhook/signed_dev',
    notes: 'HMAC-signed webhook adapter for local/staging verification. Never use as production merchant.',
  },
  {
    providerKey: 'ethiopia_ready',
    displayName: 'Ethiopia provider (awaiting merchant API)',
    secretEnvKey: 'PAYMENT_API_KEY',
    webhookPath: '/api/v1/payments/webhook/ethiopia_ready',
    notes:
      'Placeholder until official Chapa/Telebirr (or other) merchant API docs and credentials are wired.',
  },
];

export async function ensurePaymentProviderConfigs() {
  for (const row of DEFAULT_ROWS) {
    await db.paymentProviderConfig.upsert({
      where: { providerKey: row.providerKey },
      update: {
        displayName: row.displayName,
        secretEnvKey: row.secretEnvKey,
        webhookPath: row.webhookPath,
      },
      create: {
        providerKey: row.providerKey,
        displayName: row.displayName,
        environment: 'sandbox',
        isEnabled: row.providerKey === getConfiguredProviderId(),
        secretEnvKey: row.secretEnvKey,
        webhookPath: row.webhookPath,
        supportedCurrencies: 'ETB',
        notes: row.notes,
      },
    });
  }
}

export function secretConfigured(secretEnvKey?: string | null): boolean {
  if (!secretEnvKey) return false;
  return Boolean(process.env[secretEnvKey]?.trim());
}

/** Safe public/admin serialization — never includes secret values. */
export function serializeProviderConfig(row: {
  id: string;
  providerKey: string;
  displayName: string;
  environment: string;
  isEnabled: boolean;
  publicKey: string | null;
  secretEnvKey: string | null;
  webhookPath: string | null;
  supportedCurrencies: string;
  notes: string | null;
  updatedAt: Date;
}) {
  const runtime = listPaymentProviders().find((p) => p.id === row.providerKey);
  return {
    id: row.id,
    providerKey: row.providerKey,
    displayName: row.displayName || runtime?.displayName || row.providerKey,
    environment: row.environment,
    isEnabled: row.isEnabled,
    publicKey: row.publicKey,
    secretEnvKey: row.secretEnvKey,
    secretConfigured: secretConfigured(row.secretEnvKey),
    webhookPath: row.webhookPath,
    supportedCurrencies: parseCurrencyList(row.supportedCurrencies),
    notes: row.notes,
    isActiveRuntime: getConfiguredProviderId() === row.providerKey,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProviderConfigsSafe() {
  await ensurePaymentProviderConfigs();
  const rows = await db.paymentProviderConfig.findMany({
    orderBy: { providerKey: 'asc' },
  });
  return rows.map(serializeProviderConfig);
}

export async function updateProviderConfig(
  providerKey: string,
  input: {
    displayName?: string;
    environment?: 'sandbox' | 'production';
    isEnabled?: boolean;
    publicKey?: string | null;
    secretEnvKey?: string | null;
    webhookPath?: string | null;
    supportedCurrencies?: string[];
    notes?: string | null;
  }
) {
  await ensurePaymentProviderConfigs();
  return db.paymentProviderConfig.update({
    where: { providerKey },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.environment !== undefined ? { environment: input.environment } : {}),
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      ...(input.publicKey !== undefined ? { publicKey: input.publicKey } : {}),
      ...(input.secretEnvKey !== undefined ? { secretEnvKey: input.secretEnvKey } : {}),
      ...(input.webhookPath !== undefined ? { webhookPath: input.webhookPath } : {}),
      ...(input.supportedCurrencies !== undefined
        ? { supportedCurrencies: formatCurrencyList(input.supportedCurrencies) }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
}
