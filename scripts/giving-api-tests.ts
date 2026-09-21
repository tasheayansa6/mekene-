/**
 * Phase 15/28 giving anonymous security checks.
 * APP_URL=http://localhost:3000 npx tsx scripts/giving-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  let json: { success: boolean; message: string | null } | null = null;
  try {
    json = JSON.parse(text) as { success: boolean; message: string | null };
  } catch {
    json = { success: false, message: text.slice(0, 120) };
  }
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const mine = await req('/api/v1/giving/my');
  if (mine.status !== 401) fail(`anonymous my giving must be 401, got ${mine.status}`);

  const statements = await req('/api/v1/giving/statements');
  if (statements.status !== 401) {
    fail(`anonymous statements must be 401, got ${statements.status}`);
  }

  const admin = await req('/api/v1/admin/giving/overview');
  if (admin.status !== 401) fail(`anonymous admin overview must be 401, got ${admin.status}`);

  const funds = await req('/api/v1/admin/finance/funds');
  if (funds.status !== 401) fail(`anonymous funds must be 401, got ${funds.status}`);

  const providers = await req('/api/v1/admin/finance/payment-providers');
  if (providers.status !== 401) {
    fail(`anonymous payment providers must be 401, got ${providers.status}`);
  }

  const exportCsv = await req('/api/v1/admin/giving/export');
  if (exportCsv.status !== 401 && exportCsv.status !== 403) {
    fail(`anonymous export must be blocked, got ${exportCsv.status}`);
  }

  const webhook = await req('/api/v1/payments/webhook/signed_dev', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bme-signature': 'invalid' },
    body: JSON.stringify({ event_id: 'x' }),
  });
  if (webhook.status !== 401) fail(`invalid webhook must be 401, got ${webhook.status}`);

  const options = await req('/api/v1/giving/options');
  if (options.status !== 200) fail(`public options should be 200, got ${options.status}`);

  console.log('Giving API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
