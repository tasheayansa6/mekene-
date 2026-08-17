import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, Calendar, User, ArrowRight } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { NewsCard } from '@/components/cards/NewsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { newsData } from '@/data/news';

export const metadata: Metadata = {
  title: 'News & Announcements | Busa Mekenene Eyasus Church',
  description:
    'Stay informed with the latest news, updates, and announcements from Busa Mekenene Eyasus Church.',
};

const priorityVariant = {
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

export default function NewsPage() {
  const featuredArticle = newsData[0];
  const remainingArticles = newsData.slice(1);

  return (
    <div className="page-transition">
      <PageHero
        title="News & Announcements"
        subtitle="Stay Informed"
        description="Catch up on the latest happenings, announcements, and stories from our church community."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'News' },
        ]}
      />

      {/* Featured Article */}
      <Section variant="warm">
        <SectionHeading
          icon={Newspaper}
          title="Featured Article"
          align="left"
          description="The latest and most important news from our church."
          className="mb-10"
        />

        <Link href={`/news/${featuredArticle.slug}`}>
          <div className="mx-auto max-w-4xl rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/30 hover:shadow-md md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={priorityVariant[featuredArticle.priority]}>
                {featuredArticle.priority.charAt(0).toUpperCase() +
                  featuredArticle.priority.slice(1)}
              </Badge>
              <Badge variant="outline">{featuredArticle.category}</Badge>
            </div>

            <h2 className="mt-4 text-2xl font-bold leading-tight text-primary md:text-3xl">
              {featuredArticle.title}
            </h2>

            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {featuredArticle.content}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {featuredArticle.author && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {featuredArticle.author}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {featuredArticle.date}
              </span>
            </div>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Read Full Article
              <ArrowRight className="size-4" />
            </span>
          </div>
        </Link>
        {/* [PLACEHOLDER] Featured article image to be added when available */}
      </Section>

      {/* All News */}
      <Section>
        <SectionHeading
          title="All News"
          description="Browse through our latest articles and updates."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {remainingArticles.map((article) => (
            <Link key={article.slug} href={`/news/${article.slug}`}>
              <NewsCard
                title={article.title}
                content={article.content}
                date={article.date}
                author={article.author}
                priority={article.priority}
              />
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
