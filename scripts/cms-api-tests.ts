/**
 * Phase 8/25 CMS anonymous security checks.
 * Run against a local server: APP_URL=http://localhost:3000 npx tsx scripts/cms-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  let json: { success: boolean; data: unknown; message: string | null } | null = null;
  try {
    json = (await res.json()) as { success: boolean; data: unknown; message: string | null };
  } catch {
    json = { success: false, data: null, message: 'non-json' };
  }
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const adminPages = await req('/api/v1/admin/content/pages');
  if (adminPages.status !== 401) fail(`anonymous admin pages must be 401, got ${adminPages.status}`);

  const cmsOverview = await req('/api/v1/admin/cms/overview');
  if (cmsOverview.status !== 401) fail(`anonymous cms overview must be 401, got ${cmsOverview.status}`);

  const cmsFaqsAdmin = await req('/api/v1/admin/cms/faqs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: 'x', answer: 'y' }),
  });
  if (cmsFaqsAdmin.status !== 401 && cmsFaqsAdmin.status !== 403) {
    fail(`anonymous FAQ create must be blocked, got ${cmsFaqsAdmin.status}`);
  }

  const createNews = await req('/api/v1/admin/content/news', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x', content: 'y' }),
  });
  if (createNews.status !== 401 && createNews.status !== 403) {
    fail(`anonymous create must be rejected, got ${createNews.status}`);
  }

  const draftGuess = await req('/api/v1/content/news/unpublished-draft-should-not-exist');
  if (draftGuess.status !== 404) fail(`missing/draft news must be 404, got ${draftGuess.status}`);

  const search = await req('/api/v1/content/search?q=church');
  if (search.status !== 200) fail(`public search should be 200, got ${search.status}`);

  const publicNews = await req('/api/v1/content/news');
  if (publicNews.status !== 200) fail(`public news list should be 200, got ${publicNews.status}`);

  const publicFaqs = await req('/api/v1/content/faqs');
  if (publicFaqs.status !== 200) fail(`public faqs should be 200, got ${publicFaqs.status}`);

  const publicMenus = await req('/api/v1/content/menus/main');
  if (publicMenus.status !== 200) fail(`public main menu should be 200, got ${publicMenus.status}`);

  console.log('CMS API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
