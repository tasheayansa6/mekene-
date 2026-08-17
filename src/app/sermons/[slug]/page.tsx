import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  BookOpen,
  Play,
  Video,
  ArrowLeft,
} from 'lucide-react';

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
import { sermonsData, getSermonBySlug, getRelatedSermons } from '@/data/sermons';
import { createPageMetadata } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return sermonsData.map((sermon) => ({
    slug: sermon.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sermon = getSermonBySlug(slug);
  if (!sermon) {
    return { title: 'Sermon Not Found | Busa Mekenene Eyasus Church' };
  }
  return createPageMetadata({
    title: `${sermon.title} | Busa Mekenene Eyasus Church`,
    description: sermon.description,
    path: `/sermons/${sermon.slug}`,
    type: 'article',
  });
}

export default async function SermonDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const sermon = getSermonBySlug(slug);
  if (!sermon) {
    notFound();
  }

  const relatedSermons = getRelatedSermons(sermon.slug);

  const formattedDate = new Date(sermon.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="page-transition">
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
          {/* Content area - 2/3 */}
          <article>
            {/* Category & Date */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{sermon.category}</Badge>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-3.5" />
                {formattedDate}
              </span>
            </div>

            {/* Full description */}
            <div className="prose prose-neutral max-w-none">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {sermon.fullDescription || sermon.description}
              </p>
            </div>

            {/* Scripture Reference */}
            {sermon.scriptureReference && (
              <>
                <Separator className="my-8" />
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <BookOpen className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Scripture Reference
                    </p>
                    <p className="mt-1 font-semibold">{sermon.scriptureReference}</p>
                  </div>
                </div>
              </>
            )}

            {/* Audio / Video placeholder */}
            {(sermon.audioUrl || sermon.videoUrl) && (
              <>
                <Separator className="my-8" />
                <div className="flex flex-wrap gap-3">
                  {sermon.audioUrl && (
                    <Button variant="outline" className="gap-2">
                      <Play className="size-4" />
                      Listen to Audio
                    </Button>
                  )}
                  {sermon.videoUrl && (
                    <Button variant="outline" className="gap-2">
                      <Video className="size-4" />
                      Watch Video
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Back link */}
            <div className="mt-10">
              <Button variant="ghost" asChild>
                <Link href="/sermons">
                  <ArrowLeft className="mr-2 size-4" />
                  All Sermons
                </Link>
              </Button>
            </div>
          </article>

          {/* Sidebar - 1/3 */}
          <aside className="space-y-6">
            {/* Speaker info card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About the Speaker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {sermon.speaker
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="font-semibold">{sermon.speaker}</p>
                    <p className="text-sm text-muted-foreground">
                      Busa Mekenene Eyasus Church
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sermon details card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sermon Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="secondary" className="text-xs">
                    {sermon.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Related sermons */}
            {relatedSermons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related Sermons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedSermons.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/sermons/${related.slug}`}
                      className="group block"
                    >
                      <p className="text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                        {related.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {related.speaker} · {related.date}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </Section>
    </div>
  );
}
