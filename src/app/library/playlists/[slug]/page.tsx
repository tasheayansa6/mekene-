import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { PlaylistPlayer } from '@/components/library/PlaylistPlayer';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { getPublicPlaylistBySlug } from '@/lib/library/playlists';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicPlaylistBySlug(slug);
  if (!result) return { title: 'Playlist Not Found' };
  return createPageMetadata({
    title: result.playlist.title,
    description: result.playlist.description || `Playlist: ${result.playlist.title}`,
    path: `/library/playlists/${result.playlist.slug}`,
    image: result.playlist.coverImageUrl || undefined,
  });
}

export default async function LibraryPlaylistDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicPlaylistBySlug(slug);
  if (!result) notFound();
  const { playlist, items } = result;

  return (
    <div className="page-transition">
      <PageHero
        title={playlist.title}
        subtitle="Playlist"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Playlists', href: '/library/playlists' },
          { label: playlist.title },
        ]}
      />
      <Section>
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/library/playlists">All playlists</Link>
        </Button>
        {playlist.description ? (
          <div className="mx-auto mb-8 max-w-3xl">
            <MarkdownContent content={playlist.description} />
          </div>
        ) : null}
        <div className="mx-auto max-w-3xl">
          <PlaylistPlayer items={items.filter(Boolean) as Parameters<typeof PlaylistPlayer>[0]['items']} />
        </div>
      </Section>
    </div>
  );
}
