'use client';

import { useChurchProfile } from '@/hooks/use-church-profile';
import { formatTimeRange } from '@/lib/church-api';
import { churchConfig } from '@/config/church';
import { Clock, Facebook, Youtube, Send, Instagram, Music, ExternalLink, Twitter } from 'lucide-react';

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  youtube: Youtube,
  telegram: Send,
  x: ExternalLink,
  twitter: Twitter,
  instagram: Instagram,
  tiktok: Music,
};

export function FooterSocialLinks() {
  const { data: profile } = useChurchProfile();

  const links = profile?.socialLinks && profile.socialLinks.length > 0
    ? profile.socialLinks
    : Object.entries(churchConfig.social)
        .filter(([, url]) => !!url)
        .map(([platform, url]) => ({
          id: platform,
          platform,
          url: url!,
          displayName: platform.charAt(0).toUpperCase() + platform.slice(1),
          isActive: true,
          sortOrder: 0,
        }));

  return (
    <div className="flex items-center gap-3">
      {links.map((link) => {
        const Icon = platformIcons[link.platform.toLowerCase()] || ExternalLink;
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.displayName || link.platform}
            className="rounded-full p-2 transition-colors hover:bg-primary-foreground/10"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}

export function FooterServiceTimes() {
  const { data: profile } = useChurchProfile();

  const services = profile?.serviceSchedules && profile.serviceSchedules.length > 0
    ? profile.serviceSchedules
    : churchConfig.serviceTimes.map((s) => ({
        id: s.day + s.name,
        dayOfWeek: s.day,
        serviceName: s.name,
        startTime: s.time,
        endTime: null,
      }));

  return (
    <ul className="space-y-3">
      {services.map((service) => (
        <li key={service.id} className="space-y-0.5">
          <p className="text-sm font-medium">{service.serviceName}</p>
          <p className="text-xs text-primary-foreground/60">
            {service.dayOfWeek} &middot;{' '}
            {'startTime' in service && service.startTime.includes(':')
              ? formatTimeRange(service.startTime, service.endTime)
              : service.startTime}
          </p>
        </li>
      ))}
    </ul>
  );
}
