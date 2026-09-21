/**
 * Phase 17 event registration anonymous security checks.
 * APP_URL=http://localhost:3000 npx tsx scripts/events-registration-api-tests.ts
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
  const mine = await req('/api/v1/events/my');
  if (mine.status !== 401) fail(`anonymous my events must be 401, got ${mine.status}`);

  const regs = await req('/api/v1/events/registrations');
  if (regs.status !== 401) fail(`anonymous registrations must be 401, got ${regs.status}`);

  const adminRegs = await req('/api/v1/admin/events/x/registrations');
  if (adminRegs.status !== 401 && adminRegs.status !== 404) {
    fail(`anonymous admin registrations must be blocked, got ${adminRegs.status}`);
  }

  const reports = await req('/api/v1/admin/events/reports');
  if (reports.status !== 401) fail(`anonymous reports must be 401, got ${reports.status}`);

  const exportCsv = await req('/api/v1/admin/events/x/export');
  if (exportCsv.status !== 401 && exportCsv.status !== 403 && exportCsv.status !== 404) {
    fail(`anonymous export must be blocked, got ${exportCsv.status}`);
  }

  const calendar = await req('/api/v1/events/calendar?from=2026-01-01T00:00:00.000Z&to=2026-12-31T00:00:00.000Z');
  if (calendar.status !== 200) fail(`public calendar should be 200, got ${calendar.status}`);

  console.log('Event registration API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
