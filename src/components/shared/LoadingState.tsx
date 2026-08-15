import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  count?: number;
  type?: 'card' | 'list' | 'table';
}

export function LoadingState({
  count = 3,
  type = 'card',
}: LoadingStateProps) {
  if (type === 'card') {
    return (
      <div
        className={cn(
          'grid gap-6',
          count === 1
            ? 'grid-cols-1'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <Skeleton className="aspect-video w-full rounded-md" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-4 border-b pb-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
        </div>
        {/* Rows */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
