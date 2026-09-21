import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag, Users } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { GalleryVideoList } from '@/components/gallery/GalleryVideoList';
import { ShareButtons } from '@/components/sermons/ShareButtons';
import { getPublicAlbumBySlug } from '@/lib/gallery/public';
import { RESERVED_ALBUM_SLUGS } from '@/lib/gallery/access';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_ALBUM_SLUGS.has(slug)) return { title: 'Album Not Found', robots: { index: false } };
  const album = await getPublicAlbumBySlug(slug);
  if (!album) return { title: 'Album Not Found', robots: { index: false, follow: false } };
  const hasMedia = Boolean((album.photos && album.photos.length) || (album.videos && album.videos.length));
  return {
    ...createPageMetadata({
      title: album.seoTitle || album.title,
      description: album.seoDescription || album.description || `Gallery album: ${album.title}`,
      path: `/gallery/${album.slug}`,
      image: album.coverImageUrl || undefined,
    }),
    robots: hasMedia ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function AlbumPage({ params }: PageProps) {
  const { slug } = await params;
  if (RESERVED_ALBUM_SLUGS.has(slug)) notFound();
  const album = await getPublicAlbumBySlug(slug);
  if (!album) notFound();
  const photos = (album.photos || []).map((item) => ({
    title: item!.title,
    imageUrl: item!.fileUrl || item!.thumbnailUrl || '',
    altText: item!.altText || item!.title,
    caption: item!.caption,
    description: item!.description,
  })).filter((item) => item.imageUrl);
  const videos = album.videos || [];
  const pageUrl = `https://busamekeneeyasus.org/gallery/${album.slug}`;
  const dateLabel = album.albumDate
    ? new Date(album.albumDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="page-transition">
      <PageHero
        title={album.title}
        subtitle={album.category?.name || 'Gallery album'}
        description={album.description || undefined}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Gallery', href: '/gallery' },
          { label: album.title },
        ]}
      />
      <Section>
        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {dateLabel ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-4" aria-hidden />
              {dateLabel}
            </span>
          ) : null}
          {album.category ? (
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <Tag className="size-3" aria-hidden />
              {album.category.name}
            </Badge>
          ) : null}
          {album.event ? (
            <Link href={`/events/${album.event.slug}`} className="underline">
              {album.event.title}
            </Link>
          ) : null}
          {album.ministry ? (
            <Link href={`/ministries/${album.ministry.slug}`} className="inline-flex items-center gap-1 underline">
              <Users className="size-4" aria-hidden />
              {album.ministry.name}
            </Link>
          ) : null}
        </div>
        <ShareButtons url={pageUrl} title={album.title} />
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Photos</h2>
          <GalleryGrid images={photos} />
        </div>
        {videos.length ? (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-semibold">Videos</h2>
            <GalleryVideoList videos={videos as never} />
          </div>
        ) : null}
        <div className="mt-10">
          <Button asChild variant="outline">
            <Link href="/gallery">
              <ArrowLeft className="mr-2 size-4" />
              Back to gallery
            </Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
