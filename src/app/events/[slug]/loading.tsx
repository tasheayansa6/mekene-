import { Skeleton } from '@/components/ui/skeleton';

export default function EventDetailLoading() {
  return (
    <div className="page-transition">
      {/* Hero skeleton */}
      <section className="bg-primary py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton className="mx-auto mb-4 h-4 w-32" />
            <Skeleton className="mx-auto h-10 w-64" />
            <Skeleton className="mx-auto mt-4 h-5 w-96 max-w-full" />
          </div>
        </div>
      </section>

      {/* Content skeleton */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mb-8 h-10 w-40" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </section>
    </div>
  );
}
