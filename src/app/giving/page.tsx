import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Heart,
  Globe,
  Building2,
  Gift,
  Clock,
  Info,
  MapPin,
  Phone,
} from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { churchConfig } from '@/config/church';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardHover } from '@/components/cards/CardHover';

export const metadata: Metadata = {
  title: 'Giving & Donations | Busa Mekenene Eyasus Church',
  description:
    'Support the mission and ministry of Busa Mekenene Eyasus Church through tithes, offerings, and charitable giving in the Ethiopian Evangelical tradition.',
};

const givingCategories = [
  {
    icon: Heart,
    title: 'Tithe',
    description:
      'A tenth of your income, returned to God as an act of faith and obedience.',
  },
  {
    icon: Heart,
    title: 'Offering',
    description:
      'Freewill gifts given during worship services and beyond.',
  },
  {
    icon: Globe,
    title: 'Mission',
    description:
      'Supporting mission work and spreading the Gospel.',
  },
  {
    icon: Building2,
    title: 'Church Development',
    description:
      'Contributing to the maintenance and improvement of our church facilities.',
  },
  {
    icon: Gift,
    title: 'Other',
    description:
      'For special causes, charitable work, and community support.',
  },
];

const givingMethods = [
  {
    title: 'In Person During Service',
    description:
      'Place your tithes and offerings in the collection basket during any of our worship services.',
  },
  {
    title: 'Church Office',
    description:
      'Visit the church office during business hours to make your donation directly.',
  },
  {
    title: 'Bank Transfer',
    description:
      'Contact the church office for bank account details to transfer your gift electronically.',
  },
];

export default function GivingPage() {
  const { serviceTimes, contact } = churchConfig;

  return (
    <div className="page-transition">
      {/* Hero */}
      <PageHero
        title="Giving & Donations"
        subtitle="Support Our Mission"
        description="Your generous giving supports the ministry, mission, and community of Busa Mekenene Eyasus Church."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Giving' },
        ]}
      />

      {/* Why We Give */}
      <Section variant="warm">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title="Why We Give"
            description="Giving is an act of worship and gratitude in the Ethiopian Evangelical tradition."
            icon={Heart}
          />
          <p className="mt-8 text-balance text-lg leading-relaxed text-muted-foreground">
            In the Ethiopian Evangelical Church Mekane Yesus, giving is deeply rooted in our
            faith and spiritual practice. Tithes and offerings are not merely financial
            obligations — they are acts of worship, expressions of gratitude, and
            demonstrations of trust in God&rsquo;s provision. As the Apostle Paul wrote
            in 2 Corinthians 9:7, &ldquo;Each of you should give what you have decided
            in your heart to give, not reluctantly or under compulsion, for God loves a
            cheerful giver.&rdquo;
          </p>
          <p className="mt-6 text-balance text-lg leading-relaxed text-muted-foreground">
            Our church relies on the faithful generosity of its members to sustain its
            ministries, maintain its facilities, support those in need, and spread the
            Gospel. Every gift, regardless of size, makes a meaningful difference in the
            life of our community and the lives we serve.
          </p>
        </div>
      </Section>

      {/* Giving Categories */}
      <Section>
        <SectionHeading
          title="Giving Categories"
          description="Choose how you would like to contribute to the work of the church."
          icon={Gift}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {givingCategories.map((category) => (
            <CardHover key={category.title}>
              <Card className="h-full text-center">
                <CardHeader>
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <category.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                  <Button disabled variant="outline" className="w-full">
                    Give
                  </Button>
                </CardContent>
              </Card>
            </CardHover>
          ))}
        </div>
      </Section>

      {/* How to Give */}
      <Section variant="warm">
        <SectionHeading
          title="How to Give"
          description="There are several convenient ways to support our church."
          icon={Clock}
        />
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-3">
          {givingMethods.map((method, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <CardTitle className="text-base">{method.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {method.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Payment Integration Notice */}
      <Section variant="muted">
        <div className="mx-auto max-w-2xl">
          <Card className="border-l-4 border-l-secondary">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                  <Info className="size-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Online Payment Coming Soon</CardTitle>
                  <CardDescription className="mt-1">
                    Online payment integration is planned for a future phase. For now,
                    please give in person during our services or contact the church
                    office for bank transfer details.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </Section>

      {/* Give in Person CTA */}
      <Section variant="primary">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title="Give in Person"
            description="Join us for worship and bring your tithes and offerings."
            icon={MapPin}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceTimes.map((service) => (
              <Card
                key={service.name}
                className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
              >
                <CardHeader className="pb-2">
                  <CardDescription className="text-primary-foreground/70">
                    {service.day}
                  </CardDescription>
                  <CardTitle className="text-base text-primary-foreground">
                    {service.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-secondary">
                    {service.time}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link href="/contact">
                <Phone className="mr-2 size-4" />
                Contact Church Office
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
