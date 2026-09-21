import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listPublicPlaylists } from '@/lib/library/playlists';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Playlists',
    description: 'Curated sermon and teaching playlists from Busa Mekene Eyasus Church.',
    path: '/library/playlists',
  });
}

export default async function LibraryPlaylistsPage() {
  const data = await listPublicPlaylists({ pageSize: 24 });

  return (
    <div className="page-transition">
      <PageHero
        title="Playlists"
        subtitle="Curated collections"
        description="Hand-picked sermon and teaching collections for focused listening."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Playlists' },
        ]}
      />
      <Section>
        <SectionHeading title="Public playlists" align="left" />
        {data.playlists.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No playlists published yet.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.playlists.map((playlist) => (
              <Card key={playlist.id} className="transition-colors hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link className="hover:text-primary" href={playlist.href}>
                      {playlist.title}
                    </Link>
                  </CardTitle>
                  {playlist.description ? (
                    <CardDescription className="line-clamp-3">{playlist.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {playlist.itemCount} item{playlist.itemCount === 1 ? '' : 's'}
                    {playlist.isFeatured ? ' · Featured' : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
