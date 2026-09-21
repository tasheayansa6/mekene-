/**
 * Phase 7 Admin API security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/admin-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

interface ApiBody {
  success: boolean;
  data: unknown;
  message: string | null;
}

async function req(
  path: string,
  options: RequestInit & { csrf?: string; cookie?: string } = {}
) {
  const headers = new Headers(options.headers);
  if (options.csrf) headers.set('x-csrf-token', options.csrf);
  if (options.cookie) headers.set('cookie', options.cookie);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiBody;
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const dashboardAnon = await req('/api/v1/admin/dashboard');
  if (dashboardAnon.status !== 401) {
    fail(`anonymous dashboard must be 401, got ${dashboardAnon.status}`);
  }

  const activityAnon = await req('/api/v1/admin/activity');
  if (activityAnon.status !== 401) {
    fail(`anonymous activity must be 401, got ${activityAnon.status}`);
  }

  const ministriesAnon = await req('/api/v1/admin/ministries');
  if (ministriesAnon.status !== 401) {
    fail(`anonymous ministries must be 401, got ${ministriesAnon.status}`);
  }

  const settingsAnon = await req('/api/v1/admin/settings');
  if (settingsAnon.status !== 401) {
    fail(`anonymous settings must be 401, got ${settingsAnon.status}`);
  }

  const status = await req('/api/v1/public/status');
  if (status.status !== 200 || status.json.success !== true) {
    fail('public status endpoint should be available');
  }
  const maintenance = (status.json.data as { maintenanceMode?: boolean } | null)?.maintenanceMode;
  if (maintenance !== false && maintenance !== true) {
    fail('maintenanceMode must be a boolean from the database');
  }

  console.log('Admin API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
