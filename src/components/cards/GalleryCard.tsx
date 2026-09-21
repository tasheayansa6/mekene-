import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardHover } from './CardHover';

interface GalleryCardProps {
  title: string;
  imageUrl?: string | null;
  description?: string;
  albumName?: string;
  href?: string;
  altText?: string;
}

export function GalleryCard({
  title,
  imageUrl,
  description,
  albumName,
  href = '/gallery',
  altText,
}: GalleryCardProps) {
  return (
    <Link href={href} className="focus-ring block rounded-lg">
      <CardHover>
        <Card className="group relative gap-0 overflow-hidden rounded-lg py-0">
          <div className="relative aspect-square w-full overflow-hidden bg-muted sm:aspect-[4/3]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={altText || title}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-end p-4">
                <h3 className="text-sm font-semibold">{title}</h3>
              </div>
            )}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
              <h3 className="text-sm font-semibold leading-snug text-white">{title}</h3>
              {description ? <p className="mt-1 line-clamp-2 text-xs text-white/80">{description}</p> : null}
            </div>
          </div>
          {albumName ? (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="border-0 bg-black/50 text-xs text-white backdrop-blur-sm">
                {albumName}
              </Badge>
            </div>
          ) : null}
        </Card>
      </CardHover>
    </Link>
  );
}
