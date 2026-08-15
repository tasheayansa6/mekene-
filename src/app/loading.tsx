import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <Container className="py-10">
      {/* Hero skeleton */}
      <Skeleton className="h-64 w-full rounded-xl" />

      {/* Card skeletons grid */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </Container>
  );
}
