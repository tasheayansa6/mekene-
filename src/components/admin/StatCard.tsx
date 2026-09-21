import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  href,
  icon: Icon,
  comingSoon = false,
  loading = false,
}: {
  label: string;
  value?: number | string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : comingSoon ? (
          <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
        ) : (
          <p className="text-3xl font-bold tabular-nums">{value ?? 0}</p>
        )}
        {href && !comingSoon ? (
          <Link
            href={href}
            className={cn(
              'mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline'
            )}
          >
            View
            <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
