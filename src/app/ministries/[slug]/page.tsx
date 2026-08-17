import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Users,
  Clock,
  CheckCircle2,
  Mail,
  Phone,
  ArrowRight,
} from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ministriesData, getMinistryBySlug } from '@/data/ministries';
import { churchConfig } from '@/config/church';
import { createPageMetadata } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ministriesData.map((ministry) => ({
    slug: ministry.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ministry = getMinistryBySlug(slug);
  if (!ministry) {
    return { title: 'Ministry Not Found | Busa Mekenene Eyasus Church' };
  }
  return createPageMetadata({
    title: `${ministry.name} | Busa Mekenene Eyasus Church`,
    description: ministry.description,
    path: `/ministries/${ministry.slug}`,
  });
}

export default async function MinistryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const ministry = getMinistryBySlug(slug);
  if (!ministry) {
    notFound();
  }

  const Icon = ministry.icon;

  return (
    <div className="page-transition">
      <PageHero
        title={ministry.name}
        subtitle="Ministry"
        description={ministry.description}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Ministries', href: '/ministries' },
          { label: ministry.name },
        ]}
      />

      {/* About This Ministry */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-primary">About This Ministry</h2>
          </div>

          <p className="text-lg leading-relaxed text-muted-foreground">
            {ministry.fullDescription || ministry.description}
          </p>

          <Separator className="my-8" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Led by</p>
                <p className="font-semibold">{ministry.leaderName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Members</p>
                <p className="font-semibold">
                  {ministry.memberCount} active{' '}
                  {ministry.memberCount === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* What We Do */}
      <Section variant="warm">
        <SectionHeading
          icon={CheckCircle2}
          title="What We Do"
          align="left"
          description="Key activities and responsibilities of this ministry."
          className="mb-10"
        />

        <div className="mx-auto max-w-3xl space-y-4">
          {(ministry.activities || []).map((activity, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xs font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-muted-foreground">{activity}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Meeting Schedule */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            icon={Clock}
            title="Meeting Schedule"
            align="left"
            className="mb-8"
          />
          <Card>
            <CardHeader>
              <CardTitle>Regular Meeting Times</CardTitle>
              <CardDescription>
                Join us at our scheduled meetings. All are welcome!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{ministry.schedule}</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Join This Ministry CTA */}
      <Section variant="primary">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
            Join {ministry.name}
          </h2>
          <div className="gold-accent-line mx-auto mt-4 w-24" />
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/80">
            We would love to have you be part of this ministry. Whether you are
            looking to serve, learn, or simply connect with fellow believers, reach
            out to us today.
          </p>

          <Card className="mx-auto mt-8 max-w-md bg-primary-foreground/10 backdrop-blur">
            <CardContent className="p-6">
              <div className="space-y-3 text-left text-primary-foreground/90">
                <div className="flex items-center gap-3">
                  <Mail className="size-5 shrink-0" />
                  <span>{churchConfig.contact.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="size-5 shrink-0" />
                  <span>{churchConfig.contact.phone}</span>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="mt-6 w-full"
                variant="secondary"
              >
                <Link href="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
