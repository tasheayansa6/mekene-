/**
 * Phase 14 attendance anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/attendance-api-tests.ts
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
  const mine = await req('/api/v1/attendance/my');
  if (mine.status !== 401) fail(`anonymous attendance history must be 401, got ${mine.status}`);

  const active = await req('/api/v1/attendance/sessions/active');
  if (active.status !== 401) fail(`anonymous active sessions must be 401, got ${active.status}`);

  const checkIn = await req('/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: 'x' }),
  });
  if (checkIn.status !== 401 && checkIn.status !== 403) {
    fail(`anonymous check-in must be rejected, got ${checkIn.status}`);
  }

  const adminSessions = await req('/api/v1/admin/attendance/sessions');
  if (adminSessions.status !== 401) {
    fail(`anonymous admin sessions must be 401, got ${adminSessions.status}`);
  }

  const exportCsv = await req('/api/v1/admin/attendance/export');
  if (exportCsv.status !== 401 && exportCsv.status !== 403) {
    fail(`anonymous export must be blocked, got ${exportCsv.status}`);
  }

  const publicDirectory = await req('/api/v1/attendance/public');
  if (publicDirectory.status === 200) fail('public individual attendance must not exist');

  console.log('Attendance API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
