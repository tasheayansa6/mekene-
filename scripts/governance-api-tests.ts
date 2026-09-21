/**
 * Phase 34 governance anonymous / IDOR surface checks.
 * Run: APP_URL=http://localhost:3000 npx tsx scripts/governance-api-tests.ts
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
  const paths = [
    '/api/v1/admin/governance/overview',
    '/api/v1/admin/governance/leadership',
    '/api/v1/admin/governance/leadership/history',
    '/api/v1/admin/governance/committees',
    '/api/v1/admin/governance/committees/fake-id',
    '/api/v1/admin/governance/meetings',
    '/api/v1/admin/governance/meetings/fake-id',
    '/api/v1/admin/governance/decisions',
    '/api/v1/admin/governance/resolutions',
    '/api/v1/admin/governance/action-items',
    '/api/v1/admin/governance/policies',
    '/api/v1/admin/governance/documents',
    '/api/v1/admin/governance/reports',
    '/api/v1/admin/governance/requests',
    '/api/v1/admin/governance/approvals',
    '/api/v1/governance/dashboard',
    '/api/v1/governance/committees/fake-id',
    '/api/v1/member/requests',
    '/api/v1/member/requests/fake-id',
  ];

  for (const path of paths) {
    const result = await req(path);
    if (result.status !== 401) {
      fail(`anonymous ${path} must be 401, got ${result.status}`);
    }
  }

  for (const [path, body] of [
    ['/api/v1/admin/governance/committees', { name: 'X' }],
    ['/api/v1/admin/governance/meetings', { title: 'X', startsAt: new Date().toISOString() }],
    ['/api/v1/admin/governance/resolutions', { title: 'X' }],
    ['/api/v1/admin/governance/policies', { title: 'X' }],
    ['/api/v1/member/requests', { categoryId: 'x', title: 't', description: 'd' }],
    [
      '/api/v1/admin/governance/meetings/fake/votes',
      { choice: 'approve' },
    ],
  ] as const) {
    const result = await req(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (result.status !== 401 && result.status !== 403) {
      fail(`anonymous POST ${path} must be rejected, got ${result.status}`);
    }
  }

  console.log('governance-api-tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
