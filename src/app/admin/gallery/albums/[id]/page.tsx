import { AlbumForm } from '@/components/admin/gallery/AlbumForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AlbumForm id={id} />;
}
