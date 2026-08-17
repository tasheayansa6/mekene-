import type { Metadata } from 'next';
import { Mail, Phone, MapPin } from 'lucide-react';

import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { churchConfig } from '@/config/church';

export const metadata: Metadata = {
  title: 'Contact Us | Busa Mekenene Eyasus Church',
  description: `Get in touch with ${churchConfig.branding.name}.`,
};

export default function ContactPage() {
  const { contact } = churchConfig;

  return (
    <Section>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary md:text-4xl">
          Contact Us
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          We would love to hear from you. Reach out through any of the channels
          below.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-5 text-primary" />
            </div>
            <CardTitle className="text-sm">Email</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <a
              href={`mailto:${contact.email}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {contact.email}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Phone className="size-5 text-primary" />
            </div>
            <CardTitle className="text-sm">Phone</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <a
              href={`tel:${contact.phone}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {contact.phone}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="size-5 text-primary" />
            </div>
            <CardTitle className="text-sm">Location</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              {contact.address}
              <br />
              {contact.city}, {contact.country}
            </p>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
