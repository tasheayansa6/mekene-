#!/usr/bin/env node
/**
 * Fail the build if /faq still imports Prisma/CMS (old deploy source).
 * Vercel logs that still show faqs.ts:43 findMany mean this script never ran.
 */
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const faqPage = join(root, 'src/app/faq/page.tsx');
const marker = join(root, 'DEPLOY_BUILD_MARKER.txt');

if (!existsSync(faqPage)) {
  console.error('assert-faq-static: missing src/app/faq/page.tsx');
  process.exit(1);
}

const source = readFileSync(faqPage, 'utf8');
const forbidden = ['getPublicFaqBundle', '@/lib/db', '@/lib/cms/faqs', 'listPublicFaqs', 'cms/search'];
const hits = forbidden.filter((token) => source.includes(token));
if (hits.length) {
  console.error('assert-faq-static: /faq must not import DB/CMS. Found:', hits.join(', '));
  process.exit(1);
}
if (!source.includes('FaqClientList')) {
  console.error('assert-faq-static: /faq must use FaqClientList (client fetch).');
  process.exit(1);
}

const markerText = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : 'unknown';
console.log(`assert-faq-static: ok (marker=${markerText})`);
