import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, BookOpen, User, Users, HandHeart } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { PrayerRequestForm } from '@/components/forms/PrayerRequestForm';
import { PrayButton } from '@/components/prayer/PrayButton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPublicPrayerList } from '@/lib/prayer/public';
import { prayerPageRobots } from '@/lib/prayer/seo';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Prayer',
    description:
      'Submit a prayer request and join Busa Mekene Eyasus Church in prayer.',
    robots: await prayerPageRobots(),
  };
}

const prayerTypes = [
  {
    icon: User,
    title: 'Private prayer',
    description:
      'Personal prayer is the foundation of spiritual life, including daily prayers and meditation on Scripture.',
  },
  {
    icon: Users,
    title: 'Corporate prayer',
    description:
      'Gathered prayer during worship unites the community as we bring our needs before God together.',
  },
  {
    icon: HandHeart,
    title: 'Intercessory prayer',
    description:
      'Our prayer team lifts up the needs of the congregation and community, following the call to bear one another’s burdens.',
  },
];

export default async function PrayerPage() {
  const publicList = await getPublicPrayerList({ page: 1, pageSize: 8 });

  return (
    <div className="page-transition">
      <PageHero
        title="Prayer"
        subtitle="Spiritual Support"
        description="Share your prayer needs with our community. We believe in the power of prayer and are here to support you through intercession."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Prayer' },
        ]}
      />

      <Section variant="warm">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title="The power of prayer"
            description="Prayer is central to our faith and the heartbeat of our community."
            icon={Heart}
          />
          <p className="mt-8 text-balance text-lg leading-relaxed text-muted-foreground">
            In the Ethiopian Evangelical tradition, prayer is not merely a practice
            but a way of life. Our prayer team is available to support the community —
            lifting up your needs, concerns, and thanksgivings before God.
          </p>
          <Button asChild className="mt-8">
            <Link href="/prayer/request">Submit a prayer request</Link>
          </Button>
        </div>
      </Section>

      <Section id="request">
        <SectionHeading
          title="Submit a prayer request"
          description="Share your prayer need with our caring prayer team."
          icon={Heart}
        />
        <div className="mx-auto mt-12 max-w-2xl">
          <Card className="border-t-4 border-t-primary">
            <CardContent className="p-6 sm:p-8">
              <PrayerRequestForm />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section variant="warm" id="requests">
        <SectionHeading
          title="Prayer requests"
          description="Only requests that a moderator has approved for public display appear here."
          icon={Heart}
        />
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {publicList.items.length === 0 ? (
            <p className="text-center text-muted-foreground">
              There are no public prayer requests right now. You can still submit a private request.
            </p>
          ) : (
            publicList.items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link href={`/prayer/${item.id}`} className="hover:underline">
                      {item.title}
                    </Link>
                  </CardTitle>
                  {item.category ? (
                    <p className="text-sm text-muted-foreground">{item.category.name}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
                  <PrayButton requestId={item.id} initialCount={item.prayedCount} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Section>

      <Section>
        <SectionHeading
          title="Prayer resources"
          description="Prayer takes many forms in our church community."
          icon={BookOpen}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {prayerTypes.map((type) => (
            <Card key={type.title} className="h-full text-center">
              <CardHeader>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <type.icon className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{type.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
