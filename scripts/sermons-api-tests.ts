/**
 * Phase 9 sermon anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/sermons-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  const json = (await res.json()) as { success: boolean; data: unknown; message: string | null };
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const adminList = await req('/api/v1/admin/sermons');
  if (adminList.status !== 401) fail(`anonymous admin sermons must be 401, got ${adminList.status}`);

  const create = await req('/api/v1/admin/sermons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x', sermonDate: new Date().toISOString() }),
  });
  if (create.status !== 401 && create.status !== 403) {
    fail(`anonymous create must be rejected, got ${create.status}`);
  }

  const upload = await req('/api/v1/admin/sermons/uploads', { method: 'POST', body: new FormData() });
  if (upload.status !== 401 && upload.status !== 403) {
    fail(`anonymous upload must be rejected, got ${upload.status}`);
  }

  const draftGuess = await req('/api/v1/sermons/unpublished-draft-should-not-exist');
  if (draftGuess.status !== 404) fail(`missing/draft sermon must be 404, got ${draftGuess.status}`);

  const publicList = await req('/api/v1/sermons');
  if (publicList.status !== 200) fail(`public sermon list should be 200, got ${publicList.status}`);

  const series = await req('/api/v1/sermons/series');
  if (series.status !== 200) fail(`public series list should be 200, got ${series.status}`);

  const categories = await req('/api/v1/sermons/categories');
  if (categories.status !== 200) fail(`public categories should be 200, got ${categories.status}`);

  console.log('Sermon API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
