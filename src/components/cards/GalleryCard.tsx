import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardHover } from './CardHover';

interface GalleryCardProps {
  title: string;
  imageUrl: string;
  description?: string;
  albumName?: string;
}

export function GalleryCard({
  title,
  imageUrl,
  description,
  albumName,
}: GalleryCardProps) {
  return (
    <Link href="/gallery">
      <CardHover>
        <Card className="group relative gap-0 overflow-hidden rounded-lg py-0">
          {/* Image */}
          <div className="relative aspect-square w-full overflow-hidden sm:aspect-[4/3]">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <h3 className="text-sm font-semibold leading-snug text-white">
                {title}
              </h3>
              {description && (
                <p className="mt-1 line-clamp-2 text-xs text-white/80">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Album badge */}
          {albumName && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="bg-black/50 text-white backdrop-blur-sm border-0 text-xs"
              >
                {albumName}
              </Badge>
            </div>
          )}
        </Card>
      </CardHover>
    </Link>
  );
}
