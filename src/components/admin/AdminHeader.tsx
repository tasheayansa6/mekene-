'use client';

import { usePathname } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { AdminUserMenu } from '@/components/admin/AdminUserMenu';
import { NotificationBell } from '@/components/communications/NotificationBell';

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mr-2 hidden h-4 sm:block" />
      <div className="hidden min-w-0 flex-1 md:block">
        <AdminBreadcrumbs pathname={pathname} />
      </div>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <AdminSearch />
        <NotificationBell viewAllHref="/member/notifications" />
        <AdminUserMenu />
      </div>
    </header>
  );
}
