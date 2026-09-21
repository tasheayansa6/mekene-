/**
 * Phase 12 gallery anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/gallery-api-tests.ts
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
  const adminList = await req('/api/v1/admin/gallery/albums');
  if (adminList.status !== 401) fail(`anonymous admin albums must be 401, got ${adminList.status}`);

  const create = await req('/api/v1/admin/gallery/albums', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  });
  if (create.status !== 401 && create.status !== 403) {
    fail(`anonymous create must be rejected, got ${create.status}`);
  }

  const upload = await req('/api/v1/admin/gallery/uploads', { method: 'POST', body: new FormData() });
  if (upload.status !== 401 && upload.status !== 403) {
    fail(`anonymous upload must be rejected, got ${upload.status}`);
  }

  const publish = await req('/api/v1/admin/gallery/albums/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'publish', ids: ['x'] }),
  });
  if (publish.status !== 401 && publish.status !== 403) {
    fail(`anonymous publish must be rejected, got ${publish.status}`);
  }

  const publicList = await req('/api/v1/gallery/albums');
  if (publicList.status !== 200 || !publicList.json?.success) {
    fail(`public album list should succeed, got ${publicList.status}`);
  }
  const albums = Array.isArray(publicList.json.data) ? publicList.json.data : [];
  for (const album of albums as Array<Record<string, unknown>>) {
    if (album.status && album.status !== 'published') {
      fail('public album list leaked a non-published status');
    }
  }

  const missing = await req('/api/v1/gallery/albums/this-album-does-not-exist');
  if (missing.status !== 404) fail(`missing album must be 404, got ${missing.status}`);

  console.log('gallery anonymous API checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
