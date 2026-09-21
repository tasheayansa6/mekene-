import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Button } from '@/components/ui/button';
import { SermonCard } from '@/components/cards/SermonCard';
import { getScriptureLibrary } from '@/lib/library/public';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Scripture Library',
    description: 'Browse sermons and teachings by Bible book.',
    path: '/library/scripture',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function LibraryScripturePage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const { book } = await searchParams;
  const data = await getScriptureLibrary(book);

  return (
    <div className="page-transition">
      <PageHero
        title={book ? data.book || book : 'Scripture Library'}
        subtitle="Browse by book"
        description="Find sermons and teachings organized by Bible book."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Library', href: '/library' },
          { label: 'Scripture', href: '/library/scripture' },
          ...(book ? [{ label: book }] : []),
        ]}
      />
      <Section>
        <SectionHeading title="Bible books" align="left" />
        {data.books.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No scripture references indexed yet.</p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="sm" variant={!book ? 'default' : 'outline'}>
              <Link href="/library/scripture">All books</Link>
            </Button>
            {data.books.map((bookName) => (
              <Button
                key={bookName}
                asChild
                size="sm"
                variant={book === bookName ? 'default' : 'outline'}
              >
                <Link href={`/library/scripture?book=${encodeURIComponent(bookName)}`}>
                  {bookName}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </Section>

      {book && data.book ? (
        <Section variant="muted">
          <SectionHeading title={`Sermons in ${data.book}`} align="left" />
          {data.sermons.length === 0 ? (
            <p className="mt-6 text-muted-foreground">No sermons found for this book.</p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.sermons.map((sermon) => (
                <div key={sermon.id} className="space-y-2">
                  <SermonCard
                    title={sermon.title}
                    speaker={sermon.speakerName}
                    date={formatDate(sermon.sermonDate)}
                    description={sermon.description}
                    thumbnailUrl={sermon.thumbnailUrl}
                    thumbnailAlt={sermon.thumbnailAlt}
                    href={`/sermons/${sermon.slug}`}
                    hasAudio={sermon.hasAudio}
                    hasVideo={Boolean(sermon.video)}
                  />
                  {sermon.scriptureLabels?.length ? (
                    <p className="text-xs text-muted-foreground">
                      {sermon.scriptureLabels.join(' · ')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}
    </div>
  );
}
