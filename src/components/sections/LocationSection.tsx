import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { churchConfig } from '@/config/church';

interface LocationSectionProps {
  className?: string;
  showMap?: boolean;
  compact?: boolean;
}

export function LocationSection({ className, showMap = true, compact = false }: LocationSectionProps) {
   const { contact, serviceTimes } = churchConfig;

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
                {contact.address}, {contact.city}, {contact.country}
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
                href={`tel:${contact.phone}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {contact.phone}
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
                href={`mailto:${contact.email}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {contact.email}
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
                Sunday 7:00 AM – 12:00 PM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
