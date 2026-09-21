/**
 * Phase 11 prayer anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/prayer-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  let json: { success: boolean; data: unknown; message: string | null } | null = null;
  try {
    json = JSON.parse(text) as { success: boolean; data: unknown; message: string | null };
  } catch {
    json = { success: false, data: null, message: text.slice(0, 120) };
  }
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const adminList = await req('/api/v1/admin/prayer');
  if (adminList.status !== 401) fail(`anonymous admin prayer must be 401, got ${adminList.status}`);

  const memberMine = await req('/api/v1/prayer/my');
  if (memberMine.status !== 401) fail(`anonymous member prayer must be 401, got ${memberMine.status}`);

  const otherId = await req('/api/v1/prayer/my/not-a-real-id');
  if (otherId.status !== 401) fail(`anonymous member detail must be 401, got ${otherId.status}`);

  const publicList = await req('/api/v1/prayer/public');
  if (publicList.status !== 200) fail(`public prayer list should be 200, got ${publicList.status}`);
  const rows = (publicList.json?.data || []) as Array<Record<string, unknown>>;
  for (const row of rows) {
    if ('guestEmail' in row || 'assignedTo' in row || 'notes' in row || 'userId' in row) {
      fail('public prayer list leaked internal fields');
    }
  }

  const privateGuess = await req('/api/v1/prayer/public/unpublished-private-should-not-exist');
  if (privateGuess.status !== 404) fail(`missing/private prayer must be 404, got ${privateGuess.status}`);

  const create = await req('/api/v1/admin/prayer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  });
  if (create.status !== 401 && create.status !== 403 && create.status !== 405) {
    fail(`anonymous admin create must be rejected, got ${create.status}`);
  }

  console.log('Prayer API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
