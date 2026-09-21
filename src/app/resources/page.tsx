import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Search } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getPublicResources } from '@/lib/content/public';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Resources',
  description: 'Published study guides, forms, and church documents available for download.',
};

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const { rows, categories, totalItems, pageSize } = await getPublicResources({
    q: params.q,
    category: params.category,
    page: Number.isNaN(page) ? 1 : page,
  });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="page-transition">
      <PageHero
        title="Resources"
        subtitle="Grow in Faith"
        description="Published documents and study materials. Only approved, public resources are listed."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Resources' },
        ]}
      />

      <Section>
        <form className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row" action="/resources" method="get">
          <label className="sr-only" htmlFor="resource-search">
            Search resources
          </label>
          <Input id="resource-search" name="q" defaultValue={params.q || ''} placeholder="Search resources" />
          <Button type="submit">
            <Search className="mr-2 size-4" />
            Search
          </Button>
        </form>
        {categories.length > 0 ? (
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap gap-2">
            <Button asChild size="sm" variant={!params.category ? 'default' : 'outline'}>
              <Link href="/resources">All</Link>
            </Button>
            {categories.map((category) => (
              <Button
                key={category.slug}
                asChild
                size="sm"
                variant={params.category === category.slug ? 'default' : 'outline'}
              >
                <Link href={`/resources?category=${category.slug}`}>{category.name}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </Section>

      <Section variant="warm">
        <SectionHeading
          title="Available resources"
          description={totalItems ? undefined : 'No published resources yet. Check back after administrators add files.'}
        />
        {rows.length > 0 ? (
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2">
            {rows.map((resource) => (
              <Card key={resource.id}>
                <CardHeader>
                  {resource.category ? <Badge variant="outline">{resource.category.name}</Badge> : null}
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {resource.fileUrl ? (
                    <Button asChild>
                      <a href={`/api/v1/content/resources/${resource.slug}/download`}>
                        <Download className="mr-2 size-4" />
                        Download
                      </a>
                    </Button>
                  ) : null}
                  {resource.externalUrl ? (
                    <Button asChild variant="outline">
                      <a href={resource.externalUrl} rel="noopener noreferrer" target="_blank">
                        Open link
                      </a>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
        {totalPages > 1 ? (
          <div className="mt-10 flex justify-center gap-3">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={`/resources?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline">
                <Link href={`/resources?page=${page + 1}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
