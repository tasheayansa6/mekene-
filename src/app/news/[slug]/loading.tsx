import { Skeleton } from '@/components/ui/skeleton';

export default function NewsDetailLoading() {
  return (
    <div className="page-transition">
      {/* Hero skeleton */}
      <section className="bg-primary py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton className="mx-auto mb-4 h-4 w-32" />
            <Skeleton className="mx-auto h-10 w-72" />
          </div>
        </div>
      </section>

      {/* Content skeleton */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mb-8 h-10 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-3/4" />
            <Skeleton className="mt-6 h-px w-full" />
            <Skeleton className="mt-6 h-4 w-full" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </div>
        </div>
      </section>
    </div>
  );
}
