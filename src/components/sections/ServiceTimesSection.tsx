'use client';

import { Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { useChurchProfile } from '@/hooks/use-church-profile';
import { formatTimeRange } from '@/lib/church-api';
import { churchConfig } from '@/config/church';
import type { ChurchServiceSchedule } from '@/lib/church-api';

interface ServiceTimesSectionProps {
  variant?: 'default' | 'warm' | 'primary';
  className?: string;
}

function ServiceCard({ service }: { service: ChurchServiceSchedule }) {
  return (
    <Card className="border-border/50 text-center transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary">
          {service.serviceName}
        </CardTitle>
        <CardDescription className="font-medium text-secondary">
          {service.dayOfWeek}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatTimeRange(service.startTime, service.endTime)}
        </p>
        {service.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FallbackServiceCard({
  service,
}: {
  service: { day: string; time: string; name: string; description?: string };
}) {
  return (
    <Card className="border-border/50 text-center transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary">{service.name}</CardTitle>
        <CardDescription className="font-medium text-secondary">
          {service.day}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {service.time}
        </p>
        {service.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceTimesSkeleton() {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/50 text-center">
          <CardHeader className="pb-3">
            <Skeleton className="mx-auto h-6 w-32" />
            <Skeleton className="mx-auto mt-1 h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mx-auto h-8 w-36" />
            <Skeleton className="mx-auto mt-2 h-4 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ServiceTimesSection({
  variant = 'warm',
  className,
}: ServiceTimesSectionProps) {
  const { data: profile, isLoading } = useChurchProfile();

  return (
    <Section variant={variant} id="services" className={className}>
      <SectionHeading
        title="Service Times"
        icon={Clock}
        description="Join us in worship and fellowship"
      />
      {isLoading ? (
        <ServiceTimesSkeleton />
      ) : profile?.serviceSchedules && profile.serviceSchedules.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-fade-in">
          {profile.serviceSchedules.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-fade-in">
          {churchConfig.serviceTimes.map((service) => (
            <FallbackServiceCard
              key={service.day + service.name}
              service={service}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
