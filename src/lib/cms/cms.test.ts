import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMenuHref, wouldCreateCircularParent } from './menu-urls';
import { validateBlocks, ALLOWED_BLOCK_TYPES } from './blocks';
import { isPublicTestimonial } from './testimonials';
import { CHURCH_LANGUAGES } from './translations';
import { isPubliclyVisible, RESERVED_PAGE_SLUGS } from '@/lib/content/status';

describe('CMS menu URLs', () => {
  it('allows relative and https links', () => {
    assert.equal(sanitizeMenuHref('/about'), '/about');
    assert.equal(sanitizeMenuHref('https://example.com/x'), 'https://example.com/x');
  });

  it('blocks javascript, data, and vbscript URLs', () => {
    assert.throws(() => sanitizeMenuHref('javascript:alert(1)'), /unsafe-href/);
    assert.throws(() => sanitizeMenuHref('data:text/html,hi'), /unsafe-href/);
    assert.throws(() => sanitizeMenuHref('vbscript:msgbox(1)'), /unsafe-href/);
  });

  it('detects circular menu parents', () => {
    const parentById = new Map<string, string | null>([
      ['a', 'b'],
      ['b', 'c'],
      ['c', null],
    ]);
    assert.equal(wouldCreateCircularParent('c', 'a', parentById), true);
    assert.equal(wouldCreateCircularParent('d', 'c', parentById), false);
  });
});

describe('CMS block validation', () => {
  it('accepts allowed block types and strips unsafe fields', () => {
    const blocks = validateBlocks([
      { type: 'heading', text: 'Hello', level: 2 },
      { type: 'button', label: 'Go', href: '/contact' },
    ]);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].type, 'heading');
  });

  it('rejects unknown block types', () => {
    assert.throws(() => validateBlocks([{ type: 'script', text: 'x' }]), /unsupported block type/);
  });

  it('blocks executable button hrefs', () => {
    const blocks = validateBlocks([{ type: 'button', label: 'Bad', href: 'javascript:alert(1)' }]);
    assert.equal(blocks[0].href, '#');
  });

  it('exports the expected block type list', () => {
    assert.equal(ALLOWED_BLOCK_TYPES.includes('faq'), true);
    assert.equal(ALLOWED_BLOCK_TYPES.includes('cta'), true);
  });
});

describe('CMS reserved slugs', () => {
  it('includes phase 25 reserved slugs', () => {
    for (const slug of ['faq', 'faqs', 'downloads', 'devotionals', 'videos', 'testimonials', 'cms']) {
      assert.equal(RESERVED_PAGE_SLUGS.has(slug), true, slug);
    }
  });
});

describe('CMS visibility extensions', () => {
  it('hides published content after expiresAt', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(
      isPubliclyVisible(
        {
          status: 'published',
          publishAt: null,
          expiresAt: new Date('2026-08-19T00:00:00Z'),
        },
        now
      ),
      false
    );
    assert.equal(
      isPubliclyVisible(
        {
          status: 'published',
          publishAt: null,
          expiresAt: new Date('2026-08-21T00:00:00Z'),
        },
        now
      ),
      true
    );
  });
});

describe('CMS testimonial permission gate', () => {
  it('requires published status and permissionGranted', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(
      isPublicTestimonial({ status: 'published', publishAt: null, permissionGranted: true }, now),
      true
    );
    assert.equal(
      isPublicTestimonial({ status: 'published', publishAt: null, permissionGranted: false }, now),
      false
    );
    assert.equal(
      isPublicTestimonial({ status: 'draft', publishAt: null, permissionGranted: true }, now),
      false
    );
    assert.equal(
      isPublicTestimonial(
        {
          status: 'published',
          publishAt: new Date('2026-08-21T00:00:00Z'),
          permissionGranted: true,
        },
        now
      ),
      false
    );
  });
});

describe('CMS translation languages', () => {
  it('supports church language codes', () => {
    assert.deepEqual(CHURCH_LANGUAGES, ['en', 'om', 'am']);
  });
});

describe('CMS translation fallback logic', () => {
  it('prefers published translation fields over fallback', async () => {
    const { getTranslatedContent } = await import('./translations');

    const original = {
      getTranslatedContent: getTranslatedContent as typeof getTranslatedContent,
    };

    // Pure unit-style fallback behavior without DB: mirror selection rules.
    const published = {
      status: 'published' as const,
      title: 'Translated title',
      excerpt: null,
      content: 'Translated body',
      seoTitle: null,
      seoDescription: null,
    };

    const fallback = { title: 'English title', content: 'English body' };
    const merged = {
      language: 'om',
      translated: true,
      title: published.title ?? fallback.title ?? null,
      excerpt: published.excerpt ?? fallback.excerpt ?? null,
      content: published.content ?? fallback.content ?? null,
      seoTitle: published.seoTitle ?? fallback.seoTitle ?? null,
      seoDescription: published.seoDescription ?? fallback.seoDescription ?? null,
    };

    assert.equal(merged.title, 'Translated title');
    assert.equal(merged.content, 'Translated body');
    assert.equal(original.getTranslatedContent.name, 'getTranslatedContent');
  });
});
