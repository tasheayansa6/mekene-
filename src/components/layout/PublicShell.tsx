'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MaintenanceView } from '@/components/layout/MaintenanceView';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiGet } from '@/lib/api/client';

const dashboardPrefixes = ['/admin', '/member'];
const allowedDuringMaintenance = [
  '/admin',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/maintenance',
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { canAccessAdmin, status } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const isDashboard = dashboardPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    void apiGet<{ maintenanceMode: boolean }>('/public/status').then((result) => {
      setMaintenanceMode(Boolean(result.data?.maintenanceMode));
    });
  }, []);

  const allowed = allowedDuringMaintenance.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const showMaintenance =
    maintenanceMode && !allowed && !canAccessAdmin && status !== 'loading';

  if (showMaintenance) {
    return <MaintenanceView />;
  }

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
