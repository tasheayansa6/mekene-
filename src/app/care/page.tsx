import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartHandshake, BookOpen, Phone, Shield } from 'lucide-react';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { churchConfig } from '@/config/church';

export const metadata: Metadata = {
  title: 'Pastoral Care',
  description:
    'Request confidential pastoral care, counseling, or an appointment at Busa Mekene Eyasus Church.',
  robots: { index: true, follow: true },
};

export default function CarePage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Pastoral Care"
        subtitle="Confidential support"
        description="Our pastoral care team offers spiritual guidance, prayer, and listening. Care conversations are private and handled only by authorized caregivers."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Care' },
        ]}
      />

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <HeartHandshake className="h-8 w-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Request care</CardTitle>
              <CardDescription>
                Submit a confidential pastoral care or counseling request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/care/request">Request care</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <BookOpen className="h-8 w-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Prayer</CardTitle>
              <CardDescription>
                Share a prayer need with the prayer ministry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/prayer">Go to prayer</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Phone className="h-8 w-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Church office</CardTitle>
              <CardDescription>
                Contact the church using official published information only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {churchConfig.contact.email ? <p>{churchConfig.contact.email}</p> : null}
              {churchConfig.contact.phone ? <p>{churchConfig.contact.phone}</p> : null}
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-muted/40">
        <SectionHeading
          icon={Shield}
          title="Important disclaimer"
          description="Pastoral care is spiritual support, not a substitute for professional services."
        />
        <p className="mx-auto mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Pastoral care and counseling at {churchConfig.branding.name} offer prayer,
          spiritual guidance, and compassionate listening. They do{' '}
          <strong>not</strong> replace medical, psychiatric, legal, or emergency services.
          If you or someone else is in immediate danger, contact your local emergency
          services. We do not publish unverified emergency numbers on this site.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/care/request">Request care</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/care">Member care dashboard</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
