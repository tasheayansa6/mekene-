/**
 * Phase 19 pastoral care anonymous security checks.
 * Run: APP_URL=http://localhost:3000 npx tsx scripts/pastoral-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string | null;
  } | null;
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const overview = await req('/api/v1/admin/pastoral/overview');
  if (overview.status !== 401) fail(`anonymous pastoral overview must be 401, got ${overview.status}`);

  const cases = await req('/api/v1/admin/pastoral/cases');
  if (cases.status !== 401) fail(`anonymous pastoral cases must be 401, got ${cases.status}`);

  const create = await req('/api/v1/admin/pastoral/cases', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ memberId: 'x', title: 'x' }),
  });
  if (create.status !== 401 && create.status !== 403) {
    fail(`anonymous pastoral create must be rejected, got ${create.status}`);
  }

  const notes = await req('/api/v1/admin/pastoral/cases/fake/notes');
  if (notes.status !== 401 && notes.status !== 404) {
    fail(`anonymous notes must be rejected, got ${notes.status}`);
  }

  const profileChanges = await req('/api/v1/members/me/profile-changes');
  if (profileChanges.status !== 401) {
    fail(`anonymous profile-changes must be 401, got ${profileChanges.status}`);
  }

  const household = await req('/api/v1/members/me/household');
  if (household.status !== 401) fail(`anonymous household must be 401, got ${household.status}`);

  const memberCare = await req('/api/v1/member/care');
  if (memberCare.status !== 401) fail(`anonymous member care must be 401, got ${memberCare.status}`);

  const careAppointments = await req('/api/v1/member/care/appointments');
  if (careAppointments.status !== 401) {
    fail(`anonymous care appointments must be 401, got ${careAppointments.status}`);
  }

  const careInfo = await req('/api/v1/public/care/info');
  if (careInfo.status !== 200) fail(`public care info must be 200, got ${careInfo.status}`);

  console.log('pastoral-api-tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
