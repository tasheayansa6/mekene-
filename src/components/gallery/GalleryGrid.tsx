'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GalleryLightbox } from './GalleryLightbox';

export interface GalleryImage {
  title: string;
  imageUrl: string;
  description?: string;
  album: string;
}

interface GalleryGridProps {
  images: GalleryImage[];
}

const albums = ['All', 'Worship Services', 'Community', 'Youth', 'Church Building'] as const;

export function GalleryGrid({ images }: GalleryGridProps) {
  const [activeAlbum, setActiveAlbum] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredImages = useMemo(() => {
    if (activeAlbum === 'All') return images;
    return images.filter((img) => img.album === activeAlbum);
  }, [images, activeAlbum]);

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function navigateLightbox(newIndex: number) {
    setLightboxIndex(newIndex);
  }

  return (
    <>
      {/* Album Filter Tabs */}
      <div className="flex justify-center">
        <Tabs
          value={activeAlbum}
          onValueChange={setActiveAlbum}
        >
          <TabsList className="flex-wrap">
            {albums.map((album) => (
              <TabsTrigger key={album} value={album}>
                {album}
                {album !== 'All' && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({images.filter((i) => i.album === album).length})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Image Grid */}
      {filteredImages.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No photos found in this album.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredImages.map((image, index) => (
            <button
              key={`${image.title}-${image.album}`}
              onClick={() => openLightbox(index)}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg focus-ring"
              aria-label={`View ${image.title}`}
            >
              <Image
                src={image.imageUrl}
                alt={image.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />

              {/* Album badge */}
              <div className="absolute top-2 left-2">
                <Badge
                  variant="secondary"
                  className="bg-black/50 text-white backdrop-blur-sm border-0 text-xs"
                >
                  {image.album}
                </Badge>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <h3 className="text-sm font-semibold leading-snug text-white">
                  {image.title}
                </h3>
                {image.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-white/80">
                    {image.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          images={filteredImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}
    </>
  );
}
