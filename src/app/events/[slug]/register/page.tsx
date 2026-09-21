import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { EventRegisterForm } from '@/components/events/EventRegisterForm';
import { getPublicEventBySlug } from '@/lib/events/public';
import { createPageMetadata } from '@/lib/seo';
import { RESERVED_EVENT_SLUGS } from '@/lib/events/access';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_EVENT_SLUGS.has(slug)) return { title: 'Register' };
  const result = await getPublicEventBySlug(slug);
  if (!result) return { title: 'Register' };
  return createPageMetadata({
    title: `Register · ${result.event.title}`,
    description: `Register for ${result.event.title} at Busa Mekene Eyasus Church.`,
    path: `/events/${result.event.slug}/register`,
  });
}

export default async function EventRegisterPage({ params }: PageProps) {
  const { slug } = await params;
  if (RESERVED_EVENT_SLUGS.has(slug)) notFound();
  const result = await getPublicEventBySlug(slug);
  if (!result) notFound();
  const { event } = result;

  return (
    <div className="page-transition">
      <PageHero
        title="Register"
        subtitle={event.title}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events', href: '/events' },
          { label: event.title, href: `/events/${event.slug}` },
          { label: 'Register' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-xl">
          <EventRegisterForm
            event={{
              title: event.title,
              slug: event.slug,
              registrationRequired: event.registrationRequired,
              allowGuestRegistration: event.allowGuestRegistration,
              capacity: event.capacity,
              registrationDeadline: event.registrationDeadline,
              timezone: event.timezone,
              status: event.status,
            }}
          />
        </div>
      </Section>
    </div>
  );
}
