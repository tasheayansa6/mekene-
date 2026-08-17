import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EventNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl font-semibold">Event Not Found</p>
      <p className="mt-2 max-w-md text-muted-foreground">
        The event you are looking for does not exist or may have been removed.
      </p>
      <Button asChild className="mt-8">
        <Link href="/events">
          <ArrowLeft className="mr-2 size-4" />
          Back to Events
        </Link>
      </Button>
    </div>
  );
}
