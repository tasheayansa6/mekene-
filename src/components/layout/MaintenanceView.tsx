import Link from 'next/link';
import { Church } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MaintenanceView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
        <Church className="size-7 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-primary">We’ll be back shortly</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Busa Mekene Eyasus Church is performing scheduled maintenance on the public
        website. Please check again soon.
      </p>
      <Button asChild className="mt-8" variant="outline">
        <Link href="/login">Administrator sign in</Link>
      </Button>
    </div>
  );
}
