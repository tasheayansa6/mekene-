import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPublicSermonBySlug } from '@/lib/sermons/public';
import { createPageMetadata } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicSermonBySlug(slug);
  if (!result || result.sermon.contentType !== 'devotion') {
    return { title: 'Devotional Not Found' };
  }
  return createPageMetadata({
    title: result.sermon.title,
    description: result.sermon.description || 'Church devotional',
    path: `/devotionals/${slug}`,
    type: 'article',
    image: result.sermon.thumbnailUrl || undefined,
  });
}

export default async function DevotionalDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicSermonBySlug(slug);
  if (!result) notFound();
  if (result.sermon.contentType !== 'devotion') {
    redirect(`/sermons/${slug}`);
  }
  redirect(`/sermons/${slug}`);
}
