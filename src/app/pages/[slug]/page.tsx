import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { getPublicPageBySlug } from '@/lib/content/public';
import { resolvePageRedirect } from '@/lib/cms/redirects';
import { createPageMetadata } from '@/lib/seo';
import { RESERVED_PAGE_SLUGS } from '@/lib/content/status';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_PAGE_SLUGS.has(slug)) return { title: 'Page Not Found' };
  const redirectSlug = await resolvePageRedirect(slug);
  if (redirectSlug) {
    return createPageMetadata({
      title: 'Redirecting…',
      description: 'Redirecting to updated page.',
      path: `/pages/${redirectSlug}`,
    });
  }
  const result = await getPublicPageBySlug(slug);
  if (!result) return { title: 'Page Not Found' };
  return createPageMetadata({
    title: result.seo.seoTitle,
    description: result.seo.seoDescription,
    path: `/pages/${result.page.slug}`,
    image: result.seo.ogImage || undefined,
  });
}

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  if (RESERVED_PAGE_SLUGS.has(slug)) notFound();
  const redirectSlug = await resolvePageRedirect(slug);
  if (redirectSlug) permanentRedirect(`/pages/${redirectSlug}`);
  const result = await getPublicPageBySlug(slug);
  if (!result) notFound();
  const { page } = result;

  return (
    <div className="page-transition">
      <PageHero
        title={page.title}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: page.title },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          {page.featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.featuredImageUrl}
              alt={page.featuredImageAlt || page.title}
              className="mb-8 w-full rounded-lg"
            />
          ) : null}
          <MarkdownContent content={page.content} />
          <Button asChild variant="ghost" className="mt-10">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" />
              Home
            </Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
