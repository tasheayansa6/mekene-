'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard admin>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
