'use client';

import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { churchConfig } from '@/config/church';
import { useChurchProfile } from '@/hooks/use-church-profile';
import { formatTimeRange } from '@/lib/church-api';

type LocationData = {
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  mainServiceTime?: string | null;
};

interface LocationSectionProps {
  className?: string;
  showMap?: boolean;
  compact?: boolean;
  locationData?: LocationData;
}

export function LocationSection({ className, showMap = true, compact = false, locationData }: LocationSectionProps) {
  const { data: profile } = useChurchProfile();

  // Use API data if available, then props, then config
  const mainLocation = profile?.locations?.find((l) => l.isMainLocation) || profile?.locations?.[0];

  const address = locationData?.address || mainLocation?.address || churchConfig.contact.address;
  const city = locationData?.city || mainLocation?.city || churchConfig.contact.city;
  const country = locationData?.country || mainLocation?.country || churchConfig.contact.country;
  const phone = locationData?.phone || mainLocation?.phone || churchConfig.contact.phone;
  const email = locationData?.email || mainLocation?.email || churchConfig.contact.email;

  // Main service time from API or hardcoded fallback
  const mainSchedule = profile?.serviceSchedules?.[0];
  const mainServiceTime = locationData?.mainServiceTime ||
    (mainSchedule
      ? `${mainSchedule.dayOfWeek} ${formatTimeRange(mainSchedule.startTime, mainSchedule.endTime)}`
      : 'Sunday 7:00 AM – 12:00 PM');

  return (
    <div className={className}>
      <div className={`grid gap-8 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {/* Map */}
        {showMap && (
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-muted">
            <div className="text-center">
              <MapPin className="mx-auto mb-3 size-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Interactive map will be displayed here</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Google Maps integration coming soon
              </p>
            </div>
          </div>
        )}

        {/* Contact Details */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Address</p>
              <p className="text-muted-foreground">
                {address}{city ? `, ${city}` : ''}{country ? `, ${country}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Phone className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Phone</p>
              <a
                href={`tel:${phone}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {phone}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Email</p>
              <a
                href={`mailto:${email}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {email}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Main Service</p>
              <p className="text-muted-foreground">
                {mainServiceTime}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
