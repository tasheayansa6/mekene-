'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryLightboxImage {
  title: string;
  imageUrl: string;
  description?: string;
}

interface GalleryLightboxProps {
  images: GalleryLightboxImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function GalleryLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: GalleryLightboxProps) {
  const current = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-ring"
        aria-label="Close"
      >
        <X className="size-6" />
      </button>

      {/* Previous button */}
      <button
        onClick={goPrev}
        disabled={!hasPrev}
        className={cn(
          'absolute left-4 z-10 flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-ring',
          !hasPrev && 'pointer-events-none opacity-30'
        )}
        aria-label="Previous image"
      >
        <ChevronLeft className="size-6" />
      </button>

      {/* Next button */}
      <button
        onClick={goNext}
        disabled={!hasNext}
        className={cn(
          'absolute right-4 z-10 flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-ring',
          !hasNext && 'pointer-events-none opacity-30'
        )}
        aria-label="Next image"
      >
        <ChevronRight className="size-6" />
      </button>

      {/* Image */}
      <div className="relative flex max-h-[80vh] max-w-[90vw] items-center justify-center">
        <Image
          src={current.imageUrl}
          alt={current.title}
          width={1200}
          height={800}
          className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
          priority
        />
      </div>

      {/* Caption */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-6 pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-lg font-semibold text-white">{current.title}</h3>
          {current.description && (
            <p className="mt-1 text-sm text-white/70">{current.description}</p>
          )}
          <p className="mt-2 text-xs text-white/50">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>
    </div>
  );
}
