import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPublicSermonBySlug } from '@/lib/sermons/public';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicSermonBySlug(slug);
  if (!result || result.sermon.contentType !== 'bible_study') {
    return { title: 'Bible Study Not Found' };
  }
  return { title: result.sermon.title, description: result.sermon.description || undefined };
}

/** Bible study detail reuses the sermon detail page for a single content system. */
export default async function BibleStudyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicSermonBySlug(slug);
  if (!result || result.sermon.contentType !== 'bible_study') notFound();
  redirect(`/sermons/${slug}`);
}
