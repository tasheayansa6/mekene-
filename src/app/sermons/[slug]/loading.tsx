import { Skeleton } from '@/components/ui/skeleton';

export default function SermonDetailLoading() {
  return (
    <div className="page-transition">
      {/* Hero skeleton */}
      <section className="bg-primary py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton className="mx-auto mb-4 h-4 w-32" />
            <Skeleton className="mx-auto h-10 w-80" />
          </div>
        </div>
      </section>

      {/* Content skeleton */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}