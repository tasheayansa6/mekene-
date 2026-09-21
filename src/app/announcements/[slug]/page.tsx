import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { authorSelect, promoteScheduledContent, serializeAuthor } from '@/lib/content/query';
import { isAnnouncementActive } from '@/lib/content/status';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Badge } from '@/components/ui/badge';
import { MarkdownContent } from '@/components/content/MarkdownContent';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await db.announcement.findUnique({ where: { slug } });
  if (!row || row.audience !== 'everyone' || !isAnnouncementActive(row)) {
    return { title: 'Announcement' };
  }
  return {
    title: row.seoTitle || row.title,
    description: row.seoDescription || row.excerpt,
  };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await promoteScheduledContent();
  const { slug } = await params;
  const row = await db.announcement.findUnique({
    where: { slug },
    include: { author: { select: authorSelect } },
  });

  if (!row || row.audience !== 'everyone' || !isAnnouncementActive(row)) {
    notFound();
  }

  return (
    <div className="page-transition">
      <PageHero
        title={row.title}
        subtitle="Announcement"
        description={row.excerpt}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Announcements', href: '/announcements' },
          { label: row.title },
        ]}
      />
      <Section>
        <article className="mx-auto max-w-3xl">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{row.priority}</Badge>
            <Badge variant="outline">{row.category}</Badge>
            {row.isFeatured ? <Badge>Featured</Badge> : null}
          </div>
          <div className="mt-6">
            <MarkdownContent content={row.content} />
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            {serializeAuthor(row.author)?.name}
          </p>
        </article>
      </Section>
    </div>
  );
}
