'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  UsersRound,
  Heart,
  HeartHandshake,
  HandHeart,
  ClipboardCheck,
  Megaphone,
  ImageIcon,
  FolderOpen,
  BarChart3,
  Settings,
  Church,
  Shield,
  Building2,
  Clock,
  MapPin,
  Share2,
  UserRoundCog,
  Briefcase,
  Tags,
  Newspaper,
  Bell,
  ScrollText,
  Clapperboard,
  FileText,
  Hash,
  ChevronRight,
  ClipboardList,
  Home,
  Send,
  Wallet,
  MessageSquare,
  AlertTriangle,
  Layout,
  HelpCircle,
  Menu,
  ListMusic,
  HeartPulse,
  Flag,
  Radio,
} from 'lucide-react';
import { adminNavigation, filterAdminNavigation, type AdminNavItem } from '@/config/admin-nav';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  UsersRound,
  Heart,
  HeartHandshake,
  HandHeart,
  ClipboardCheck,
  Megaphone,
  ImageIcon,
  FolderOpen,
  BarChart3,
  Settings,
  Church,
  Shield,
  Building2,
  Clock,
  MapPin,
  Share2,
  UserRoundCog,
  Briefcase,
  Tags,
  Newspaper,
  Bell,
  ScrollText,
  Clapperboard,
  FileText,
  Hash,
  ClipboardList,
  Home,
  Send,
  Wallet,
  MessageSquare,
  AlertTriangle,
  Layout,
  HelpCircle,
  Menu,
  ListMusic,
  HeartPulse,
  Flag,
  Radio,
};

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLeaf({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard;
  const active = isActivePath(pathname, item.href);

  if (item.comingSoon || !item.href) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          tooltip={`${item.label} — Coming Soon`}
          className="opacity-60"
        >
          <Icon className="size-4" />
          <span>{item.label}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link href={item.href}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavGroup({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard;
  const children = item.children || [];
  const open =
    children.some((child) => isActivePath(pathname, child.href)) ||
    isActivePath(pathname, item.href);

  if (item.comingSoon) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled tooltip={`${item.label} — Coming Soon`} className="opacity-60">
          <Icon className="size-4" />
          <span>{item.label}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen={open} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.label}>
            <Icon className="size-4" />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((child) => {
              const ChildIcon = iconMap[child.icon] ?? LayoutDashboard;
              if (child.comingSoon || !child.href) {
                return (
                  <SidebarMenuSubItem key={child.label}>
                    <SidebarMenuSubButton aria-disabled className="pointer-events-none opacity-60">
                      <ChildIcon className="size-4" />
                      <span>{child.label}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              }
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton asChild isActive={isActivePath(pathname, child.href)}>
                    <Link href={child.href}>
                      <ChildIcon className="size-4" />
                      <span>{child.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const items = filterAdminNavigation(adminNavigation, (resource) =>
    hasPermission(resource, 'view')
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Church className="size-5 text-primary" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">BME Church</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {user?.role.name || 'Administration'}
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) =>
              item.children?.length ? (
                <NavGroup key={item.label} item={item} pathname={pathname} />
              ) : (
                <NavLeaf key={item.label} item={item} pathname={pathname} />
              )
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <p className={cn('px-4 py-3 text-xs font-medium text-sidebar-foreground/50')}>
          Church Administration
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
