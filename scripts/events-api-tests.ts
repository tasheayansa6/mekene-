/**
 * Phase 10 event anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/events-api-tests.ts
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
  const adminList = await req('/api/v1/admin/events');
  if (adminList.status !== 401) fail(`anonymous admin events must be 401, got ${adminList.status}`);

  const create = await req('/api/v1/admin/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x', startAt: '2026-08-24T10:00', endAt: '2026-08-24T12:00' }),
  });
  if (create.status !== 401 && create.status !== 403) {
    fail(`anonymous create must be rejected, got ${create.status}`);
  }

  const upload = await req('/api/v1/admin/events/uploads', { method: 'POST', body: new FormData() });
  if (upload.status !== 401 && upload.status !== 403) {
    fail(`anonymous upload must be rejected, got ${upload.status}`);
  }

  const draftGuess = await req('/api/v1/events/unpublished-draft-should-not-exist');
  if (draftGuess.status !== 404) fail(`missing/draft event must be 404, got ${draftGuess.status}`);

  const publicList = await req('/api/v1/events');
  if (publicList.status !== 200) fail(`public event list should be 200, got ${publicList.status}`);

  const categories = await req('/api/v1/events/categories');
  if (categories.status !== 200) fail(`public categories should be 200, got ${categories.status}`);

  const locations = await req('/api/v1/events/locations');
  if (locations.status !== 200) fail(`public locations should be 200, got ${locations.status}`);

  console.log('Event API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
