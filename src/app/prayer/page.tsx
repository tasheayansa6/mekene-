import type { Metadata } from 'next';
import {
  Heart,
  User,
  Users,
  HandHeart,
  BookOpen,
  Quote,
} from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { PrayerRequestForm } from '@/components/forms/PrayerRequestForm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { CardHover } from '@/components/cards/CardHover';

export const metadata: Metadata = {
  title: 'Prayer Requests | Busa Mekenene Eyasus Church',
  description:
    'Submit a prayer request and join the Busa Mekenene Eyasus Church community in prayer. Learn about the power of prayer in the Ethiopian Orthodox Tewahedo tradition.',
};

const prayerTypes = [
  {
    icon: User,
    title: 'Private Prayer',
    description:
      'Personal, individual prayer is the foundation of spiritual life. In the Ethiopian Orthodox tradition, private prayer includes the daily office prayers, personal supplications, and meditation on the Psalms of David.',
  },
  {
    icon: Users,
    title: 'Corporate Prayer',
    description:
      'Gathered prayer during the Divine Liturgy and special prayer services unites the community. The Ethiopian Orthodox Church has a rich heritage of communal worship, where the faithful join their voices together in prayer and praise.',
  },
  {
    icon: HandHeart,
    title: 'Intercessory Prayer',
    description:
      'Praying for others is a central practice in our faith. Our dedicated prayer team lifts up the needs of the congregation and community, following the biblical call to bear one another\'s burdens through prayer.',
  },
];

const scriptures = [
  {
    reference: 'Philippians 4:6-7',
    text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
  },
  {
    reference: 'Matthew 18:20',
    text: 'For where two or three gather in my name, there am I with them.',
  },
  {
    reference: 'James 5:16',
    text: 'Therefore confess your sins to each other and pray for each other so that you may be healed. The prayer of a righteous person is powerful and effective.',
  },
];

export default function PrayerPage() {
  return (
    <div className="page-transition">
      {/* Hero */}
      <PageHero
        title="Prayer Requests"
        subtitle="Spiritual Support"
        description="Share your prayer needs with our community. We believe in the power of prayer and are here to support you through intercession."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Prayer Requests' },
        ]}
      />

      {/* About Prayer */}
      <Section variant="warm">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title="The Power of Prayer"
            description="Prayer is central to our faith and the heartbeat of our community."
            icon={Heart}
          />
          <p className="mt-8 text-balance text-lg leading-relaxed text-muted-foreground">
            In the Ethiopian Orthodox Tewahedo tradition, prayer is not merely a practice
            but a way of life. From the ancient monastic prayers of the desert fathers
            to the vibrant worship of the Divine Liturgy, prayer has always been the
            cornerstone of our spiritual heritage. Our prayer team is available to
            support the community — lifting up your needs, concerns, and thanksgivings
            before God. Whether you are facing a challenge, celebrating a blessing, or
            simply seeking God&rsquo;s guidance, we invite you to share your prayer request
            with us.
          </p>
        </div>
      </Section>

      {/* Submit a Prayer Request */}
      <Section>
        <SectionHeading
          title="Submit a Prayer Request"
          description="Share your prayer need with our caring prayer team."
          icon={Heart}
        />
        <div className="mx-auto mt-12 max-w-2xl">
          <Card className="border-t-4 border-t-primary">
            <CardContent className="p-6 sm:p-8">
              <PrayerRequestForm />
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Your prayer request will be received by our prayer team. The actual backend
            functionality will be available in a future update.
          </p>
        </div>
      </Section>

      {/* How We Pray */}
      <Section variant="warm">
        <SectionHeading
          title="How We Pray"
          description="Prayer takes many forms in our church community."
          icon={BookOpen}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {prayerTypes.map((type) => (
            <CardHover key={type.title}>
              <Card className="h-full text-center">
                <CardHeader>
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <type.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </CardContent>
              </Card>
            </CardHover>
          ))}
        </div>
      </Section>

      {/* Scripture on Prayer */}
      <Section variant="primary">
        <SectionHeading
          title="Scripture on Prayer"
          description="God's Word encourages us to pray with faith and persistence."
          icon={Quote}
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
          {scriptures.map((scripture) => (
            <Card
              key={scripture.reference}
              className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
            >
              <CardHeader className="pb-2">
                <Quote className="mb-2 size-8 text-secondary" />
                <CardDescription className="text-secondary font-semibold">
                  {scripture.reference}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-primary-foreground/90">
                  &ldquo;{scripture.text}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
