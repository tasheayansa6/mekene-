import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <AlertTriangle className="mb-6 h-16 w-16 text-muted-foreground" aria-hidden="true" />
      <p className="text-7xl font-bold text-primary sm:text-8xl md:text-9xl">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-primary sm:text-3xl">
        Page Not Found
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="mt-8">
        <Button size="lg">Return Home</Button>
      </Link>
    </Container>
  );
}
