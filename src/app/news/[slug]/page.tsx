import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { NewsCard } from '@/components/cards/NewsCard';
import { getPublicNewsBySlug } from '@/lib/content/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicNewsBySlug(slug);
  if (!result) {
    return { title: 'Article Not Found' };
  }
  return createPageMetadata({
    title: result.seo.seoTitle,
    description: result.seo.seoDescription,
    path: `/news/${result.article.slug}`,
    type: 'article',
    image: result.seo.ogImage || undefined,
  });
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicNewsBySlug(slug);
  if (!result) notFound();
  const { article, related, author } = result;

  return (
    <div className="page-transition">
      <PageHero
        title={article.title}
        subtitle="News"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'News', href: '/news' },
          { label: article.title },
        ]}
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <Button variant="ghost" asChild className="mb-8 -ml-2">
            <Link href="/news">
              <ArrowLeft className="mr-2 size-4" />
              Back to News
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            {article.category ? (
              <Badge variant="outline" className="gap-1">
                <Tag className="h-3 w-3" />
                {article.category.name}
              </Badge>
            ) : null}
            {article.tags.map((item) => (
              <Badge key={item.tag.slug} variant="secondary">
                {item.tag.name}
              </Badge>
            ))}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-primary md:text-4xl">
            {article.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {author ? (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {author.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(article.publishedAt)}
            </span>
          </div>

          <Separator className="my-8" />

          {article.featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.featuredImageUrl}
              alt={article.featuredImageAlt || article.title}
              className="mb-8 w-full rounded-lg"
            />
          ) : null}

          <article>
            <MarkdownContent content={article.content} />
          </article>

          <Separator className="my-8" />

          <Button asChild>
            <Link href="/news">
              <ArrowLeft className="mr-2 size-4" />
              All News
            </Link>
          </Button>
        </div>
      </Section>

      {related.length > 0 ? (
        <Section variant="warm">
          <h2 className="mb-8 text-center text-2xl font-bold text-primary">Related news</h2>
          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-3">
            {related.map((item) => (
              <NewsCard
                key={item.slug}
                title={item.title}
                content={item.excerpt || ''}
                date={formatDate(item.publishedAt)}
                imageUrl={item.featuredImageUrl || undefined}
                href={`/news/${item.slug}`}
              />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
