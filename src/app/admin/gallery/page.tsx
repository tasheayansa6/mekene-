import { AlbumTable } from '@/components/admin/gallery/AlbumTable';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <AlbumTable initialStatus={status} />;
}
