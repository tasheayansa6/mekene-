import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LibrarySermonRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/sermons/${slug}`);
}
