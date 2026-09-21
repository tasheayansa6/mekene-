/**
 * Phase 27 live streaming anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/live-api-tests.ts
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
  const adminList = await req('/api/v1/admin/live');
  if (adminList.status !== 401) fail(`anonymous admin live list must be 401, got ${adminList.status}`);

  const adminCreate = await req('/api/v1/admin/live', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventId: 'fake', streamUrl: 'https://www.youtube.com/watch?v=test' }),
  });
  if (adminCreate.status !== 401 && adminCreate.status !== 403) {
    fail(`anonymous admin live create must be rejected, got ${adminCreate.status}`);
  }

  const adminAnalytics = await req('/api/v1/admin/live/analytics');
  if (adminAnalytics.status !== 401) {
    fail(`anonymous admin live analytics must be 401, got ${adminAnalytics.status}`);
  }

  const adminDetail = await req('/api/v1/admin/live/nonexistent-id');
  if (adminDetail.status !== 401 && adminDetail.status !== 403) {
    fail(`anonymous admin live detail must be rejected, got ${adminDetail.status}`);
  }

  const publicLive = await req('/api/v1/live');
  if (publicLive.status !== 200) fail(`public live hub should be 200, got ${publicLive.status}`);

  const upcoming = await req('/api/v1/live/upcoming');
  if (upcoming.status !== 200) fail(`public live upcoming should be 200, got ${upcoming.status}`);

  const missingSlug = await req('/api/v1/live/not-a-real-stream-slug');
  if (missingSlug.status !== 404) {
    fail(`missing live slug must be 404, got ${missingSlug.status}`);
  }

  const chatPost = await req('/api/v1/live/not-a-real-stream-slug/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body: 'hello' }),
  });
  if (chatPost.status !== 401 && chatPost.status !== 403 && chatPost.status !== 404) {
    fail(`anonymous chat post must be rejected or 404, got ${chatPost.status}`);
  }

  const prayerPost = await req('/api/v1/live/not-a-real-stream-slug/prayer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body: 'Please pray for us', isPrivate: true }),
  });
  if (prayerPost.status !== 404 && prayerPost.status !== 403) {
    fail(`prayer on missing slug should be 404/403, got ${prayerPost.status}`);
  }

  const services = await req('/api/v1/services');
  if (services.status !== 200) fail(`public services should be 200, got ${services.status}`);

  console.log('Live API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
