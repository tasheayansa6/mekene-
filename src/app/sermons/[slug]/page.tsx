import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Download, User } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { AudioPlayer } from '@/components/sermons/AudioPlayer';
import { VideoPlayer } from '@/components/sermons/VideoPlayer';
import { ShareButtons } from '@/components/sermons/ShareButtons';
import { BookmarkButton } from '@/components/sermons/BookmarkButton';
import { getPublicSermonBySlug } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';
import { sermonJsonLd } from '@/lib/sermons/player';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === 'series' || slug === 'category') {
    return { title: 'Sermon Not Found' };
  }
  const result = await getPublicSermonBySlug(slug);
  if (!result) {
    return { title: 'Sermon Not Found' };
  }
  return createPageMetadata({
    title: result.seo.seoTitle,
    description: result.seo.seoDescription,
    path: `/sermons/${result.sermon.slug}`,
    type: 'article',
    image: result.seo.ogImage || undefined,
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function SermonDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === 'series' || slug === 'category') notFound();
  const result = await getPublicSermonBySlug(slug);
  if (!result) notFound();
  const { sermon, related } = result;
  const pageUrl = `https://busamekeneeyasus.org/sermons/${sermon.slug}`;
  const jsonLd = sermonJsonLd({
    title: sermon.title,
    description: sermon.seo.seoDescription || sermon.description,
    url: pageUrl,
    sermonDate: sermon.sermonDate,
    speakerName: sermon.speakerName,
    thumbnailUrl: sermon.thumbnailUrl,
    audioUrl: sermon.audioUrl,
    videoWatchUrl: sermon.video?.watchUrl,
    videoEmbedUrl: sermon.video?.embedUrl,
  });

  return (
    <div className="page-transition">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        title={sermon.title}
        subtitle="Sermon"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Sermons', href: '/sermons' },
          { label: sermon.title },
        ]}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <article>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <BookmarkButton sermonId={sermon.id} sermonSlug={sermon.slug} />
              {sermon.category ? (
                <Badge asChild variant="secondary">
                  <Link href={`/sermons?category=${sermon.category.slug}`}>{sermon.category.name}</Link>
                </Badge>
              ) : null}
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-3.5" aria-hidden />
                {formatDate(sermon.sermonDate)}
              </span>
              {sermon.speakerName ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="size-3.5" aria-hidden />
                  {sermon.speakerName}
                </span>
              ) : null}
            </div>

            {sermon.thumbnailUrl ? (
              <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image
                  src={sermon.thumbnailUrl}
                  alt={sermon.thumbnailAlt || sermon.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              </div>
            ) : null}

            {sermon.video?.embedUrl ? (
              <div className="mb-8">
                <VideoPlayer embedUrl={sermon.video.embedUrl} title={`${sermon.title} video`} />
              </div>
            ) : null}

            {sermon.audioUrl ? (
              <div className="mb-8">
                <AudioPlayer
                  src={sermon.audioUrl}
                  title={sermon.title}
                  sermonSlug={sermon.slug}
                  sermonId={sermon.id}
                  showDownload={Boolean(sermon.audioDownloadUrl)}
                  downloadHref={sermon.audioDownloadUrl || undefined}
                />
              </div>
            ) : null}

            {sermon.description ? <MarkdownContent content={sermon.description} /> : null}

            {sermon.scriptures.length > 0 ? (
              <>
                <Separator className="my-8" />
                <section>
                  <h2 className="text-lg font-semibold text-primary">Scripture references</h2>
                  <ul className="mt-3 space-y-1">
                    {sermon.scriptures.map((ref) => (
                      <li key={ref.id}>{ref.label}</li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}

            {sermon.notes ? (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-primary">Sermon notes</h2>
                <div className="mt-3">
                  <MarkdownContent content={sermon.notes} />
                </div>
              </section>
            ) : null}

            {sermon.hasNotesFile && sermon.notesDownloadUrl ? (
              <div className="mt-4">
                <Button asChild variant="outline">
                  <a href={sermon.notesDownloadUrl}>
                    <Download className="mr-2 size-4" />
                    Download notes{sermon.notesFileName ? ` (${sermon.notesFileName})` : ''}
                  </a>
                </Button>
              </div>
            ) : null}

            {sermon.transcript ? (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-primary">Transcript</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {sermon.transcript}
                </p>
              </section>
            ) : null}

            <section className="mt-10">
              <h2 className="mb-3 text-lg font-semibold text-primary">Share</h2>
              <ShareButtons url={pageUrl} title={sermon.title} />
            </section>

            <div className="mt-10">
              <Button variant="ghost" asChild>
                <Link href="/sermons">
                  <ArrowLeft className="mr-2 size-4" />
                  All sermons
                </Link>
              </Button>
            </div>
          </article>

          <aside className="space-y-6">
            {sermon.speakerName ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Speaker</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{sermon.speakerName}</p>
                  {sermon.speaker?.title ? (
                    <p className="text-sm text-muted-foreground">{sermon.speaker.title}</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sermon details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDate(sermon.sermonDate)}</span>
                </div>
                {sermon.series ? (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Series</span>
                      <Link className="font-medium text-primary" href={`/sermons/series/${sermon.series.slug}`}>
                        {sermon.series.name}
                      </Link>
                    </div>
                  </>
                ) : null}
                {sermon.category ? (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Category</span>
                      <Link className="font-medium text-primary" href={`/sermons?category=${sermon.category.slug}`}>
                        {sermon.category.name}
                      </Link>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {related.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related sermons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {related.map((item) => (
                    <Link key={item.slug} href={`/sermons/${item.slug}`} className="group block">
                      <p className="text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[item.speakerName, formatDate(item.sermonDate)].filter(Boolean).join(' · ')}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      </Section>
    </div>
  );
}
