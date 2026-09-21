'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Clock, MapPin, Share2 } from 'lucide-react';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin/church', label: 'Church Information', icon: Building2, exact: true },
  { href: '/admin/church/services', label: 'Service Times', icon: Clock },
  { href: '/admin/church/locations', label: 'Locations', icon: MapPin },
  { href: '/admin/church/social-links', label: 'Social Links', icon: Share2 },
];

export default function ChurchAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <PermissionGate permission="church.view">
      <div className="space-y-6">
        <nav aria-label="Church sections" className="flex flex-wrap gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </PermissionGate>
  );
}
