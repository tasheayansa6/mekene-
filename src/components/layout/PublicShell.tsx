'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const dashboardPrefixes = ['/admin', '/member'];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = dashboardPrefixes.some((p) => pathname.startsWith(p));

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
