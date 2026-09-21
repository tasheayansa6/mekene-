import { SermonTable } from '@/components/admin/sermons/SermonTable';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; contentType?: string }>;
}) {
  const { status, contentType } = await searchParams;
  return <SermonTable initialStatus={status} initialContentType={contentType} />;
}
