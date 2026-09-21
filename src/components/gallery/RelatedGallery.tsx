import Link from 'next/link';
import { GalleryCard } from '@/components/cards/GalleryCard';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/sections/SectionHeading';

export function RelatedGallery({
  title,
  albums,
}: {
  title: string;
  albums: Array<{
    id: string;
    title: string;
    slug: string;
    coverImageUrl?: string | null;
    coverImageAlt?: string | null;
    description?: string | null;
    category?: { name: string } | null;
  }>;
}) {
  if (!albums.length) return null;
  return (
    <div className="mt-10 space-y-4">
      <SectionHeading title={title} description="Published photos and videos related to this page." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <GalleryCard
            key={album.id}
            title={album.title}
            imageUrl={album.coverImageUrl}
            altText={album.coverImageAlt || album.title}
            description={album.description || undefined}
            albumName={album.category?.name}
            href={`/gallery/${album.slug}`}
          />
        ))}
      </div>
      <Button asChild variant="outline">
        <Link href="/gallery">View gallery</Link>
      </Button>
    </div>
  );
}
