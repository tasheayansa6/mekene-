/**
 * Phase 18/26 media library anonymous security checks.
 * Run: APP_URL=http://localhost:3000 npx tsx scripts/media-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: unknown;
    message?: string | null;
  } | null;
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const mediaOverview = await req('/api/v1/admin/media/overview');
  if (mediaOverview.status !== 401) {
    fail(`anonymous media overview must be 401, got ${mediaOverview.status}`);
  }

  const analytics = await req('/api/v1/admin/media/analytics');
  if (analytics.status !== 401) fail(`anonymous analytics must be 401, got ${analytics.status}`);

  const health = await req('/api/v1/admin/media/health');
  if (health.status !== 401) fail(`anonymous health must be 401, got ${health.status}`);

  const playlistsAdmin = await req('/api/v1/admin/media/playlists', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  });
  if (playlistsAdmin.status !== 401 && playlistsAdmin.status !== 403) {
    fail(`anonymous playlist create must be blocked, got ${playlistsAdmin.status}`);
  }

  const bookmarks = await req('/api/v1/member/bookmarks');
  if (bookmarks.status !== 401) fail(`anonymous bookmarks must be 401, got ${bookmarks.status}`);

  const progress = await req('/api/v1/member/library/progress');
  if (progress.status !== 401) fail(`anonymous progress must be 401, got ${progress.status}`);

  const createBookmark = await req('/api/v1/member/bookmarks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sermonSlug: 'x' }),
  });
  if (createBookmark.status !== 401 && createBookmark.status !== 403) {
    fail(`anonymous bookmark create must be rejected, got ${createBookmark.status}`);
  }

  const bibleStudy = await req('/api/v1/sermons?contentType=bible_study');
  if (bibleStudy.status !== 200) {
    fail(`bible study list should be 200, got ${bibleStudy.status}`);
  }

  const publicList = await req('/api/v1/sermons');
  if (publicList.status !== 200) fail(`public sermons should be 200, got ${publicList.status}`);

  const library = await req('/api/v1/library');
  if (library.status !== 200) fail(`public library should be 200, got ${library.status}`);

  const librarySearch = await req('/api/v1/library/search?q=faith');
  if (librarySearch.status !== 200) fail(`library search should be 200, got ${librarySearch.status}`);

  const podcast = await fetch(`${base}/podcast.xml`);
  if (podcast.status !== 200) fail(`podcast feed should be 200, got ${podcast.status}`);
  const ctype = podcast.headers.get('content-type') || '';
  if (!ctype.includes('xml') && !ctype.includes('rss')) {
    // Some stacks return text/xml or application/rss+xml
    fail(`podcast content-type unexpected: ${ctype}`);
  }

  console.log('media-api-tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
