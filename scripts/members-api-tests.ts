/**
 * Phase 13 membership anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/members-api-tests.ts
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
  const me = await req('/api/v1/members/me');
  if (me.status !== 401) fail(`anonymous member profile must be 401, got ${me.status}`);

  const membership = await req('/api/v1/members/me/membership');
  if (membership.status !== 401) fail(`anonymous membership status must be 401, got ${membership.status}`);

  const apply = await req('/api/v1/members/applications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Guest' }),
  });
  if (apply.status !== 401 && apply.status !== 403) {
    fail(`anonymous apply must be rejected, got ${apply.status}`);
  }

  const adminList = await req('/api/v1/admin/members');
  if (adminList.status !== 401) fail(`anonymous admin members must be 401, got ${adminList.status}`);

  const adminApps = await req('/api/v1/admin/members/applications');
  if (adminApps.status !== 401) fail(`anonymous applications must be 401, got ${adminApps.status}`);

  const approve = await req('/api/v1/admin/members/applications/not-real/approve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (approve.status !== 401 && approve.status !== 403) {
    fail(`anonymous approve must be rejected, got ${approve.status}`);
  }

  const exp = await req('/api/v1/admin/members/export');
  if (exp.status !== 401 && exp.status !== 403) {
    fail(`anonymous export must be blocked, got ${exp.status}`);
  }

  const directory = await req('/api/v1/members/directory');
  if (directory.status === 200) fail('public member directory must not exist');

  console.log('Membership API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
