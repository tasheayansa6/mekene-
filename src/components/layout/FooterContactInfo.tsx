'use client';

import { Mail, Phone, MapPin } from 'lucide-react';
import { useChurchProfile } from '@/hooks/use-church-profile';
import { churchConfig } from '@/config/church';

export function FooterContactInfo() {
  const { data: profile } = useChurchProfile();

  const mainLocation =
    profile?.locations?.find((l) => l.isMainLocation) ||
    profile?.locations?.[0];

  const email = profile?.email || churchConfig.contact.email;
  const phone = profile?.phone || churchConfig.contact.phone;
  const address = mainLocation?.address || churchConfig.contact.address;
  const city = mainLocation?.city || churchConfig.contact.city;
  const country = mainLocation?.country || churchConfig.contact.country;

  return (
    <address className="not-italic space-y-3">
      <a
        href={`mailto:${email}`}
        className="flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
      >
        <Mail className="size-4 shrink-0" />
        {email}
      </a>
      <a
        href={`tel:${phone}`}
        className="flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
      >
        <Phone className="size-4 shrink-0" />
        {phone}
      </a>
      <p className="flex items-start gap-2 text-sm text-primary-foreground/70">
        <MapPin className="mt-0.5 size-4 shrink-0" />
        {address}{city ? `, ${city}` : ''}{country ? `, ${country}` : ''}
      </p>
    </address>
  );
}
