'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiPost, ensureCsrfToken } from '@/lib/api/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email') || '';
  const intent = searchParams.get('intent');
  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>(
    token ? 'working' : 'idle'
  );
  const [message, setMessage] = useState(
    'Check your email for a verification link to activate your account.'
  );
  const [resendEmail, setResendEmail] = useState(email);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      await ensureCsrfToken();
      const endpoint =
        intent === 'email-change'
          ? '/auth/confirm-email-change'
          : '/auth/verify-email';
      const result = await apiPost(endpoint, { token });
      if (cancelled) return;
      if (result.success) {
        setStatus('success');
        setMessage(result.message || 'Your email has been verified.');
      } else {
        setStatus('error');
        setMessage(result.message || 'This verification link is invalid.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [intent, token]);

  async function resend() {
    if (!resendEmail) return;
    await ensureCsrfToken();
    const result = await apiPost('/auth/resend-verification', { email: resendEmail });
    setResendMessage(
      result.message ||
        'If an account needs verification, a new email has been sent.'
    );
  }

  return (
    <AuthCard title="Verify your email">
      {status === 'working' ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Confirming your email…
        </div>
      ) : (
        <Alert variant={status === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>
            {status === 'success'
              ? 'Email verified'
              : status === 'error'
                ? 'Verification needed'
                : 'Check your inbox'}
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {status === 'success' ? (
        <Button asChild className="mt-6 w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      ) : status !== 'working' ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn’t receive the email? Enter your address to send a new link.
          </p>
          <Input
            type="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="button" variant="outline" className="w-full" onClick={resend}>
            Resend verification email
          </Button>
          {resendMessage ? (
            <p className="text-sm text-muted-foreground">{resendMessage}</p>
          ) : null}
        </div>
      ) : null}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
