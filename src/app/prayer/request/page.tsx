import type { Metadata } from 'next';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { PrayerRequestForm } from '@/components/forms/PrayerRequestForm';
import { prayerPageRobots } from '@/lib/prayer/seo';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Submit a Prayer Request',
    description: 'Share a prayer request with the Busa Mekene Eyasus Church prayer team.',
    robots: await prayerPageRobots(),
  };
}

export default function PrayerRequestPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Submit a prayer request"
        subtitle="Prayer"
        description="Your request is received by the church prayer team. Private requests are never shown on the public website."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Prayer', href: '/prayer' },
          { label: 'Submit a request' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-2xl">
          <Card className="border-t-4 border-t-primary">
            <CardContent className="p-6 sm:p-8">
              <PrayerRequestForm />
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
