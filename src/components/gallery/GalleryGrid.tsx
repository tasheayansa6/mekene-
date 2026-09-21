'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GalleryLightbox, type LightboxImage } from './GalleryLightbox';

interface GalleryGridProps {
  images: LightboxImage[];
}

export function GalleryGrid({ images }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images.length) {
    return <p className="py-12 text-center text-muted-foreground">This album does not contain any published media yet.</p>;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={`${image.imageUrl}-${index}`}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg focus-ring"
            aria-label={`View ${image.title}`}
          >
            <Image
              src={image.imageUrl}
              alt={image.altText || image.title}
              fill
              loading="lazy"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 text-left opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="text-sm font-semibold text-white">{image.title}</span>
            </span>
          </button>
        ))}
      </div>
      <GalleryLightbox
        images={images}
        currentIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
