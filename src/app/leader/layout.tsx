'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';

export default function LeaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </AuthGuard>
  );
}
