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
  FolderOpen,
  BellRing,
  Settings,
  Church,
} from 'lucide-react';

import { memberNavLinks } from '@/config/church';
import { cn } from '@/lib/utils';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  User,
  Bell,
  Calendar,
  Heart,
  HandHeart,
  BookOpen,
  FolderOpen,
  BellRing,
  Settings,
};

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      {/* Sidebar */}
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-5">
          <Link href="/member" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Church className="size-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">My Account</span>
              <span className="text-xs text-sidebar-foreground/60">
                Member Portal
              </span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>My Account</SidebarGroupLabel>
            <SidebarMenu>
              {memberNavLinks.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                const isActive = pathname === item.href;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
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
            <p className="text-xs font-medium text-sidebar-foreground/50">
              Member Portal
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset>
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-sm font-medium text-muted-foreground">
              Member Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                MB
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
