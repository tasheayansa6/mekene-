import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, Calendar, User, ArrowRight, Search } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { NewsCard } from '@/components/cards/NewsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getPublicNewsList } from '@/lib/content/public';
import { serializeAuthor } from '@/lib/content/query';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'News',
  description:
    'Stay informed with published news from Busa Mekene Eyasus Church. Only verified, published articles appear here.',
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const { articles, featured, categories, totalItems, pageSize } = await getPublicNewsList({
    q: params.q,
    category: params.category,
    page: Number.isNaN(page) ? 1 : page,
  });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="page-transition">
      <PageHero
        title="News"
        subtitle="Stay Informed"
        description="Published updates from Busa Mekene Eyasus Church. Drafts and scheduled items are not listed here."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'News' },
        ]}
      />

      <Section>
        <form className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row" action="/news" method="get">
          <label className="sr-only" htmlFor="news-search">
            Search news
          </label>
          <Input
            id="news-search"
            name="q"
            defaultValue={params.q || ''}
            placeholder="Search published news"
          />
          <Button type="submit">
            <Search className="mr-2 size-4" />
            Search
          </Button>
        </form>
        {categories.length > 0 ? (
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap gap-2">
            <Button asChild size="sm" variant={!params.category ? 'default' : 'outline'}>
              <Link href="/news">All</Link>
            </Button>
            {categories.map((category) => (
              <Button
                key={category.slug}
                asChild
                size="sm"
                variant={params.category === category.slug ? 'default' : 'outline'}
              >
                <Link href={`/news?category=${category.slug}`}>{category.name}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </Section>

      {featured && !params.q && !params.category ? (
        <Section variant="warm">
          <SectionHeading
            icon={Newspaper}
            title="Featured Article"
            align="left"
            description="Highlighted news from the church website."
            className="mb-10"
          />
          <Link href={`/news/${featured.slug}`}>
            <div className="mx-auto max-w-4xl rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/30 hover:shadow-md md:p-8">
              {featured.category ? <Badge variant="outline">{featured.category.name}</Badge> : null}
              <h2 className="mt-4 text-2xl font-bold leading-tight text-primary md:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {featured.excerpt}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {serializeAuthor(featured.author)?.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(featured.publishedAt)}
                </span>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Read Full Article
                <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        </Section>
      ) : null}

      <Section>
        <SectionHeading
          title="All News"
          description={totalItems ? `${totalItems} published article${totalItems === 1 ? '' : 's'}.` : 'No published news yet.'}
        />
        {articles.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            When church administrators publish news, it will appear here.
          </p>
        ) : (
          <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <NewsCard
                key={article.id}
                title={article.title}
                content={article.excerpt || ''}
                date={formatDate(article.publishedAt)}
                author={serializeAuthor(article.author)?.name}
                imageUrl={article.featuredImageUrl || undefined}
                category={article.category?.name}
                href={`/news/${article.slug}`}
              />
            ))}
          </div>
        )}
        {totalPages > 1 ? (
          <div className="mt-10 flex justify-center gap-3">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={`/news?page=${page - 1}${params.q ? `&q=${params.q}` : ''}`}>Previous</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline">
                <Link href={`/news?page=${page + 1}${params.q ? `&q=${params.q}` : ''}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
