'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LightboxImage {
  title: string;
  imageUrl: string;
  altText?: string;
  caption?: string;
  description?: string;
}

interface GalleryLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function GalleryLightbox({
  images,
  currentIndex,
  open,
  onClose,
  onNavigate,
}: GalleryLightboxProps) {
  const current = images[currentIndex];
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open, currentIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!open) return;
      if (event.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
      if (event.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, hasPrev, hasNext, currentIndex, onNavigate]);

  if (!current) return null;
  const alt = current.altText || current.title;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[95vh] max-w-[min(96vw,72rem)] border-0 bg-black p-0 text-white sm:rounded-lg"
        aria-describedby="gallery-lightbox-caption"
      >
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <DialogDescription id="gallery-lightbox-caption" className="sr-only">
          {current.caption || current.description || current.title}
        </DialogDescription>
        <Button
          ref={closeRef}
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 text-white hover:bg-white/20"
          onClick={onClose}
          aria-label="Close photo viewer"
        >
          <X className="size-6" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-1/2 left-3 z-10 -translate-y-1/2 text-white hover:bg-white/20',
            !hasPrev && 'opacity-30'
          )}
          onClick={() => hasPrev && onNavigate(currentIndex - 1)}
          disabled={!hasPrev}
          aria-label="Previous photo"
        >
          <ChevronLeft className="size-7" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-1/2 right-3 z-10 -translate-y-1/2 text-white hover:bg-white/20',
            !hasNext && 'opacity-30'
          )}
          onClick={() => hasNext && onNavigate(currentIndex + 1)}
          disabled={!hasNext}
          aria-label="Next photo"
        >
          <ChevronRight className="size-7" />
        </Button>
        <div className="flex max-h-[78vh] items-center justify-center px-12 pt-12">
          <Image
            src={current.imageUrl}
            alt={alt}
            width={1600}
            height={1200}
            className="max-h-[78vh] w-auto object-contain"
            priority
          />
        </div>
        <div className="px-6 py-4 text-center">
          <p className="font-semibold">{current.title}</p>
          {current.caption || current.description ? (
            <p className="mt-1 text-sm text-white/80">{current.caption || current.description}</p>
          ) : null}
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-white/60">
            <ZoomIn className="size-3" aria-hidden />
            {currentIndex + 1} of {images.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
