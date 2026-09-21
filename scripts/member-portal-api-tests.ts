/**
 * Phase 29 member portal anonymous + IDOR checks.
 * APP_URL=http://localhost:3000 npx tsx scripts/member-portal-api-tests.ts
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
  const dashboard = await req('/api/v1/member/dashboard');
  if (dashboard.status !== 401) fail(`anonymous dashboard must be 401, got ${dashboard.status}`);

  const announcements = await req('/api/v1/member/announcements');
  if (announcements.status !== 401) fail(`anonymous announcements must be 401, got ${announcements.status}`);

  const saved = await req('/api/v1/member/saved');
  if (saved.status !== 401) fail(`anonymous saved must be 401, got ${saved.status}`);

  const receipts = await req('/api/v1/member/giving/receipts');
  if (receipts.status !== 401) fail(`anonymous member receipts must be 401, got ${receipts.status}`);

  const prayer = await req('/api/v1/prayer/my/other-id');
  if (prayer.status !== 401) fail(`anonymous prayer detail must be 401, got ${prayer.status}`);

  const attendance = await req('/api/v1/attendance/my/other-id');
  if (attendance.status !== 401) fail(`anonymous attendance detail must be 401, got ${attendance.status}`);

  const me = await req('/api/v1/members/me');
  if (me.status !== 401) fail(`anonymous profile must be 401, got ${me.status}`);

  const exportData = await req('/api/v1/member/export');
  if (exportData.status !== 401) fail(`anonymous export must be 401, got ${exportData.status}`);

  const password = await req('/api/v1/auth/me/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'x', newPassword: 'y' }),
  });
  if (password.status !== 401 && password.status !== 403) {
    fail(`anonymous password change must be blocked, got ${password.status}`);
  }

  const csrfSaved = await req('/api/v1/member/saved', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'sermon', entityId: 'x' }),
  });
  if (csrfSaved.status !== 401 && csrfSaved.status !== 403) {
    fail(`unauthenticated saved POST must be blocked, got ${csrfSaved.status}`);
  }

  console.log('Member portal API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
