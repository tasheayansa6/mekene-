/**
 * Phase 6 Authentication API security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/auth-api-tests.ts
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
  const csrfRes = await req('/api/v1/auth/csrf');
  const csrf =
    (csrfRes.json.data as { csrfToken?: string } | null)?.csrfToken || '';
  const csrfCookie = csrfRes.setCookie || `bme_csrf=${csrf}`;

  const meNoAuth = await req('/api/v1/auth/me');
  if (meNoAuth.status !== 401) fail(`GET /auth/me must require auth, got ${meNoAuth.status}`);

  const adminUsers = await req('/api/v1/admin/users');
  if (adminUsers.status !== 401) fail(`GET /admin/users must require auth, got ${adminUsers.status}`);

  const churchAdmin = await req('/api/v1/church/admin/profile');
  if (churchAdmin.status !== 401) fail(`church admin API must require auth, got ${churchAdmin.status}`);

  const badLogin = await req('/api/v1/auth/login', {
    method: 'POST',
    csrf,
    cookie: csrfCookie,
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
  });
  if (badLogin.status !== 401) fail(`invalid login should be 401, got ${badLogin.status}`);
  if (badLogin.json.message?.toLowerCase().includes('no account')) {
    fail('login must not reveal whether the email exists');
  }

  const forgot = await req('/api/v1/auth/forgot-password', {
    method: 'POST',
    csrf,
    cookie: csrfCookie,
    body: JSON.stringify({ email: 'nobody@example.com' }),
  });
  if (!forgot.json.message?.toLowerCase().includes('if an account exists')) {
    fail('forgot-password must use a generic response');
  }

  const noCsrf = await req('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'a@b.c', password: 'x' }),
  });
  if (noCsrf.status !== 403) fail(`CSRF should reject mutating requests, got ${noCsrf.status}`);

  console.log('Auth API security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
