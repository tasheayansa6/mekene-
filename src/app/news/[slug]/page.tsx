import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag, Share2 } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { newsData, getNewsBySlug } from '@/data/news';
import { createPageMetadata } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return newsData.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getNewsBySlug(slug);
  if (!article) {
    return { title: 'Article Not Found | Busa Mekenene Eyasus Church' };
  }
  return createPageMetadata({
    title: `${article.title} | Busa Mekenene Eyasus Church`,
    description: article.content.slice(0, 160),
    path: `/news/${article.slug}`,
    type: 'article',
  });
}

const priorityVariant = {
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getNewsBySlug(slug);
  if (!article) {
    notFound();
  }

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
          {/* Back link */}
          <Button variant="ghost" asChild className="mb-8 -ml-2">
            <Link href="/news">
              <ArrowLeft className="mr-2 size-4" />
              Back to News
            </Link>
          </Button>

          {/* Article meta */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={priorityVariant[article.priority]}>
              {article.priority.charAt(0).toUpperCase() +
                article.priority.slice(1)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Tag className="h-3 w-3" />
              {article.category}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="mt-4 text-3xl font-bold leading-tight text-primary md:text-4xl">
            {article.title}
          </h1>

          {/* Author & Date */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {article.author && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.author}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(article.date)}
            </span>
          </div>

          <Separator className="my-8" />

          {/* [PLACEHOLDER] Article image would go here when available */}

          {/* Full Content */}
          <article className="prose-custom">
            <p className="text-lg leading-relaxed text-muted-foreground">
              {article.content}
            </p>
            {/* [PLACEHOLDER] Expanded article content to be added when available */}
          </article>

          <Separator className="my-8" />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/news">
                <ArrowLeft className="mr-2 size-4" />
                All News
              </Link>
            </Button>
            <Button variant="outline">
              <Share2 className="mr-2 size-4" />
              Share Article
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
