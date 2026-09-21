import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl font-semibold">Live Stream Not Found</p>
      <p className="mt-2 max-w-md text-muted-foreground">
        This live stream does not exist, has ended, or is not available for public viewing.
      </p>
      <Button asChild className="mt-8">
        <Link href="/live">
          <ArrowLeft className="mr-2 size-4" />
          Back to Live
        </Link>
      </Button>
    </div>
  );
}
