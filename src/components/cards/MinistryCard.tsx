import Link from 'next/link';
import { Heart, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CardHover } from './CardHover';

interface MinistryCardProps {
  name: string;
  description?: string;
  leaderName?: string;
  memberCount?: number;
  icon?: React.ComponentType<{ className?: string }>;
  href: string;
}

export function MinistryCard({
  name,
  description,
  leaderName,
  memberCount,
  icon: Icon = Heart,
  href,
}: MinistryCardProps) {
  return (
    <Link href={href}>
      <CardHover>
        <Card className="group gap-0 overflow-hidden py-0 text-center transition-colors hover:border-primary/30 hover:shadow-md">
          {/* Icon */}
          <div className="flex justify-center pt-6 pb-2">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20'
              )}
            >
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Content */}
          <CardContent className="px-5 pb-2">
            <h3 className="font-semibold leading-snug">{name}</h3>
            {description && (
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </CardContent>

          {/* Footer */}
          {(leaderName || memberCount != null) && (
            <CardFooter className="justify-center gap-4 border-t px-5 py-3 text-sm text-muted-foreground">
              {leaderName && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {leaderName}
                </span>
              )}
              {memberCount != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
              )}
            </CardFooter>
          )}
        </Card>
      </CardHover>
    </Link>
  );
}
