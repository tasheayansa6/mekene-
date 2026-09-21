import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { GalleryCard } from '@/components/cards/GalleryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPublicAlbumList, getPublicCategories } from '@/lib/gallery/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

function queryString(params: Record<string, string | undefined>, page?: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  if (page && page > 1) next.set('page', String(page));
  const qs = next.toString();
  return qs ? `/gallery?${qs}` : '/gallery';
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const result = await getPublicAlbumList({ page: 1, pageSize: 1, q: params.q, sort: 'newest' });
  const hasContent = result.totalItems > 0;
  return {
    ...createPageMetadata({
      title: 'Photo Gallery',
      description:
        'Browse published photo and video albums from Busa Mekene Eyasus Church. Content appears only after authorized staff review it.',
      path: '/gallery',
    }),
    robots: hasContent ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    search?: string;
    category?: string;
    ministry?: string;
    event?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q || params.search || '';
  const page = Number(params.page || 1);
  const sort = params.sort === 'oldest' || params.sort === 'featured' ? params.sort : 'newest';
  const type = params.type === 'photo' || params.type === 'video' ? params.type : undefined;
  const [result, categories] = await Promise.all([
    getPublicAlbumList({
      q,
      category: params.category,
      ministry: params.ministry,
      event: params.event,
      type,
      sort,
      page: Number.isNaN(page) ? 1 : page,
      pageSize: 12,
    }),
    getPublicCategories(),
  ]);
  const featured = result.albums.filter((album) => album && album.isFeatured).slice(0, 3);
  const totalPages = Math.max(1, Math.ceil(result.totalItems / result.pageSize));
  const filterParams = {
    q: q || undefined,
    category: params.category,
    ministry: params.ministry,
    event: params.event,
    type,
    sort: sort === 'newest' ? undefined : sort,
  };
  const empty = result.totalItems === 0;

  return (
    <div className="page-transition">
      <PageHero
        title="Gallery"
        subtitle="Photos and videos"
        description="Published albums from church life. Draft and private media are never shown here."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Gallery' }]}
      />
      <Section>
        <SectionHeading title="Browse albums" icon={Camera} description="Search and filter published gallery content." />
        <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]" action="/gallery" method="get">
          <Input name="q" defaultValue={q} placeholder="Search albums" aria-label="Search gallery" />
          <select
            name="category"
            defaultValue={params.category || ''}
            className="h-10 rounded-md border bg-background px-3 text-sm"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-md border bg-background px-3 text-sm"
            aria-label="Sort albums"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="featured">Featured</option>
          </select>
          <select
            name="type"
            defaultValue={type || ''}
            className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"
            aria-label="Filter by media type"
          >
            <option value="">Photos and videos</option>
            <option value="photo">Photos</option>
            <option value="video">Videos</option>
          </select>
          <Button type="submit">Apply</Button>
        </form>
        {featured.length && !q && !params.category && !type ? (
          <div className="mt-10">
            <h2 className="text-lg font-semibold">Featured albums</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((album) =>
                album ? (
                  <GalleryCard
                    key={album.id}
                    title={album.title}
                    imageUrl={album.coverImageUrl}
                    altText={album.coverImageAlt || album.title}
                    description={album.description || undefined}
                    albumName={album.category?.name}
                    href={`/gallery/${album.slug}`}
                  />
                ) : null
              )}
            </div>
          </div>
        ) : null}
        <div className="mt-10">
          {empty ? (
            <p className="py-12 text-center text-muted-foreground">
              {q || params.category || type ? 'No gallery results found.' : 'No gallery albums available yet.'}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.albums.map((album) =>
                album ? (
                  <GalleryCard
                    key={album.id}
                    title={album.title}
                    imageUrl={album.coverImageUrl}
                    altText={album.coverImageAlt || album.title}
                    description={album.description || undefined}
                    albumName={album.category?.name}
                    href={`/gallery/${album.slug}`}
                  />
                ) : null
              )}
            </div>
          )}
        </div>
        {totalPages > 1 ? (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Gallery pagination">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={queryString(filterParams, page - 1)}>Previous</Link>
              </Button>
            ) : null}
            <span className="self-center text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Button asChild variant="outline">
                <Link href={queryString(filterParams, page + 1)}>Next</Link>
              </Button>
            ) : null}
          </nav>
        ) : null}
      </Section>
    </div>
  );
}
