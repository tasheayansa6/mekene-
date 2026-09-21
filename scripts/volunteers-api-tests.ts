/**
 * Phase 21 + Phase 33 volunteer anonymous security checks.
 * Run: APP_URL=http://localhost:3000 npx tsx scripts/volunteers-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  await res.json().catch(() => null);
  return { status: res.status };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  for (const path of [
    '/api/v1/admin/staff',
    '/api/v1/admin/volunteers',
    '/api/v1/admin/volunteers/applications',
    '/api/v1/admin/volunteers/schedule',
    '/api/v1/admin/volunteers/reports',
    '/api/v1/admin/volunteers/roles',
    '/api/v1/admin/ministry/teams',
    '/api/v1/admin/ministry/assignments',
    '/api/v1/members/me/volunteering',
    '/api/v1/member/volunteering',
    '/api/v1/member/volunteering/history',
    '/api/v1/member/volunteering/calendar',
    '/api/v1/leader/volunteers',
    '/api/v1/leader/volunteers/availability?memberId=x',
    '/api/v1/leader/volunteers/coverage?eventId=x',
    '/api/v1/leader/volunteers/recommendations?eventId=x',
  ]) {
    const result = await req(path);
    if (result.status !== 401) fail(`anonymous ${path} must be 401, got ${result.status}`);
  }

  const create = await req('/api/v1/admin/staff', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 'x' }),
  });
  if (create.status !== 401 && create.status !== 403) {
    fail(`anonymous staff create must be rejected, got ${create.status}`);
  }

  const hours = await req('/api/v1/admin/ministry/assignments/x/hours', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hoursMinutes: 60 }),
  });
  if (hours.status !== 401 && hours.status !== 403) {
    fail(`anonymous hour correction must be rejected, got ${hours.status}`);
  }

  const assignSelf = await req('/api/v1/leader/volunteers/assignments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventId: 'x',
      memberId: 'y',
      roleName: 'Usher',
      scheduledAt: new Date().toISOString(),
    }),
  });
  if (assignSelf.status !== 401 && assignSelf.status !== 403) {
    fail(`anonymous assignment create must be rejected, got ${assignSelf.status}`);
  }

  console.log('volunteers-api-tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
