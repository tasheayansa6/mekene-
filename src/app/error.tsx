'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <AlertCircle className="mb-6 h-16 w-16 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold text-primary sm:text-3xl">
        Something Went Wrong
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} size="lg">
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" size="lg">
            Go Home
          </Button>
        </Link>
      </div>
    </Container>
  );
}
