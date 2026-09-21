'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = (id: string) => [
  { href: `/admin/events/${id}`, label: 'Overview', exact: true },
  { href: `/admin/events/${id}/program`, label: 'Program' },
  { href: `/admin/events/${id}/resources`, label: 'Resources' },
  { href: `/admin/events/${id}/registrations`, label: 'Registrations' },
  { href: `/admin/events/${id}/check-in`, label: 'Check-in' },
  { href: `/admin/events/${id}/history`, label: 'History' },
  { href: `/admin/events/${id}/preview`, label: 'Preview' },
];

export function EventSubnav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Event sections" className="flex flex-wrap gap-2 border-b pb-3">
      {tabs(eventId).map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
