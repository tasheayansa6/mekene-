'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface GuardProps {
  children: React.ReactNode;
  admin?: boolean;
}

export function AuthGuard({ children, admin = false }: GuardProps) {
  const { user, status, message, canAccessAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading' || status === 'unavailable') return;
    if (status !== 'authenticated' || !user) {
      const next = encodeURIComponent(pathname);
      const reason = status === 'unauthenticated' ? 'auth' : status;
      router.replace(`/login?next=${next}&reason=${reason}`);
    } else if (admin && !canAccessAdmin) {
      router.replace('/profile?error=forbidden');
    }
  }, [admin, canAccessAdmin, pathname, router, status, user]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert variant="destructive">
          <AlertTitle>Server unavailable</AlertTitle>
          <AlertDescription>
            {message || 'We could not reach the church platform. Please try again shortly.'}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (status !== 'authenticated' || !user) return null;
  if (admin && !canAccessAdmin) return null;

  return <>{children}</>;
}
