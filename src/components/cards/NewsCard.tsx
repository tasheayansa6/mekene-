import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardHover } from './CardHover';

interface NewsCardProps {
  title: string;
  content: string;
  date: string;
  author?: string;
  priority?: 'low' | 'medium' | 'high';
  imageUrl?: string;
}

const priorityVariant = {
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
};

export function NewsCard({
  title,
  content,
  date,
  author,
  priority,
  imageUrl,
}: NewsCardProps) {
  return (
    <Link href="/news">
      <CardHover>
        <Card className="group gap-0 overflow-hidden py-0 transition-colors hover:border-primary/30 hover:shadow-md">
          {/* Image */}
          {imageUrl && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-lg">
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          )}

          {/* Content */}
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              {priority && (
                <Badge variant={priorityVariant[priority]}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Badge>
              )}
            </div>

            <h3 className="mt-2 line-clamp-2 font-semibold leading-snug">
              {title}
            </h3>

            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
              {content}
            </p>
          </CardContent>

          {/* Footer */}
          <CardFooter className="flex-wrap gap-x-4 gap-y-1 border-t px-4 py-3 text-sm text-muted-foreground">
            {author && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {author}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
          </CardFooter>
        </Card>
      </CardHover>
    </Link>
  );
}
