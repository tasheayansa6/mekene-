/**
 * Phase 20 finance anonymous security checks.
 * Run: APP_URL=http://localhost:3000 npx tsx scripts/finance-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const overview = await req('/api/v1/admin/finance/overview');
  if (overview.status !== 401) fail(`anonymous finance overview must be 401, got ${overview.status}`);

  const expenses = await req('/api/v1/admin/finance/expenses');
  if (expenses.status !== 401) fail(`anonymous expenses must be 401, got ${expenses.status}`);

  const create = await req('/api/v1/admin/finance/expenses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ description: 'x', amount: '10.00', expenseDate: new Date().toISOString() }),
  });
  if (create.status !== 401 && create.status !== 403) {
    fail(`anonymous expense create must be rejected, got ${create.status}`);
  }

  const schedules = await req('/api/v1/giving/schedules');
  if (schedules.status !== 401) fail(`anonymous schedules must be 401, got ${schedules.status}`);

  const reports = await req('/api/v1/admin/finance/reports');
  if (reports.status !== 401) fail(`anonymous finance reports must be 401, got ${reports.status}`);

  console.log('finance-api-tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
