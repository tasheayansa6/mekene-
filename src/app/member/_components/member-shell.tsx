'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  Bell,
  Calendar,
  Heart,
  HandHeart,
  BookOpen,
  Bookmark,
  FolderOpen,
  BellRing,
  Settings,
  UsersRound,
  ClipboardCheck,
  Church,
  Home,
  Users,
  Radio,
  Megaphone,
  MessageSquare,
  Search,
  GraduationCap,
} from 'lucide-react';

import { memberPortalLinks } from '@/config/church';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { NotificationBell } from '@/components/communications/NotificationBell';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  User,
  Bell,
  Calendar,
  Heart,
  HandHeart,
  BookOpen,
  Bookmark,
  FolderOpen,
  BellRing,
  Settings,
  UsersRound,
  ClipboardCheck,
  Home,
  Users,
  Radio,
  Megaphone,
  MessageSquare,
  Search,
  Church,
  GraduationCap,
};

const mobileNav = [
  { href: '/member', label: 'Home', icon: LayoutDashboard },
  { href: '/member/events', label: 'Events', icon: Calendar },
  { href: '/give/now', label: 'Give', icon: HandHeart },
  { href: '/live', label: 'Live', icon: Radio },
  { href: '/member/settings', label: 'More', icon: Settings },
];

function MemberShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="hidden md:flex">
        <SidebarHeader className="px-4 py-5">
          <Link href="/member" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Church className="size-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">My Account</span>
              <span className="text-xs text-sidebar-foreground/60">Member Portal</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>My Account</SidebarGroupLabel>
            <SidebarMenu>
              {memberPortalLinks.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                const isActive =
                  item.href === '/member'
                    ? pathname === '/member'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarSeparator />
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-sidebar-foreground/50">Member Portal</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
          <Separator orientation="vertical" className="mr-2 hidden h-4 md:block" />
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-sm font-medium text-muted-foreground">Member portal</h1>
          </div>
          <NotificationBell viewAllHref="/member/notifications" />
          <AccountMenu adminLink={false} />
        </header>
        <div className="flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">{children}</div>
        <nav
          aria-label="Member mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden"
        >
          <ul className="grid grid-cols-5">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/member'
                  ? pathname === '/member'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-1 px-2 py-3 text-[11px] ${
                      active ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function MemberShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MemberShellInner>{children}</MemberShellInner>
    </AuthGuard>
  );
}
