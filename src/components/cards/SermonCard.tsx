import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Calendar, Play, User, Video } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CardHover } from './CardHover';

interface SermonCardProps {
  title: string;
  speaker?: string | null;
  date: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  thumbnailAlt?: string | null;
  href: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
}

export function SermonCard({
  title,
  speaker,
  date,
  description,
  thumbnailUrl,
  thumbnailAlt,
  href,
  hasAudio,
  hasVideo,
}: SermonCardProps) {
  return (
    <Link href={href}>
      <CardHover>
        <Card className="group gap-0 overflow-hidden py-0 transition-colors hover:border-primary/30 hover:shadow-md">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-lg">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={thumbnailAlt || title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10">
                <BookOpen className="h-12 w-12 text-primary/40" aria-hidden />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="line-clamp-2 font-semibold leading-snug">{title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {speaker ? (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  {speaker}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                {date}
              </span>
            </div>
            {description ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </CardContent>
          {hasAudio || hasVideo ? (
            <CardFooter className="gap-2 border-t px-4 py-3">
              {hasAudio ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Play className="h-4 w-4" aria-hidden />
                  Listen
                </span>
              ) : null}
              {hasVideo ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Video className="h-4 w-4" aria-hidden />
                  Watch
                </span>
              ) : null}
            </CardFooter>
          ) : null}
        </Card>
      </CardHover>
    </Link>
  );
}
