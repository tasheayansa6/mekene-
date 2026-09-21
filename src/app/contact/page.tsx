import type { Metadata } from 'next';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Facebook,
  Youtube,
  Send,
} from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { LocationSection } from '@/components/sections/LocationSection';
import { ContactForm } from '@/components/forms/ContactForm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { churchConfig } from '@/config/church';
import { CardHover } from '@/components/cards/CardHover';

export const metadata: Metadata = {
  title: 'Contact Us | Busa Mekene Eyasus Church',
  description: `Get in touch with ${churchConfig.branding.name}. We'd love to hear from you.`,
};

const socialLinks = [
  {
    name: 'Facebook',
    href: churchConfig.social.facebook,
    icon: Facebook,
  },
  {
    name: 'YouTube',
    href: churchConfig.social.youtube,
    icon: Youtube,
  },
  {
    name: 'Telegram',
    href: churchConfig.social.telegram,
    icon: Send,
  },
];

export default function ContactPage() {
  const { contact } = churchConfig;

  return (
    <div className="page-transition">
      {/* Hero */}
      <PageHero
        title="Contact Us"
        subtitle="Get In Touch"
        description="We would love to hear from you. Reach out through any of the channels below."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Contact' },
        ]}
      />

      {/* Contact Info Cards */}
      <Section>
        <SectionHeading
          title="How to Reach Us"
          description="Multiple ways to connect with our church community."
          icon={MessageSquare}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-fade-in">
          <CardHover>
            <Card className="h-full text-center">
              <CardHeader className="items-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="size-6 text-primary" />
                </div>
                <CardTitle className="text-base">Email</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {contact.email}
                </a>
              </CardContent>
            </Card>
          </CardHover>

          <CardHover>
            <Card className="h-full text-center">
              <CardHeader className="items-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="size-6 text-primary" />
                </div>
                <CardTitle className="text-base">Phone</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {contact.phone}
                </a>
              </CardContent>
            </Card>
          </CardHover>

          <CardHover>
            <Card className="h-full text-center">
              <CardHeader className="items-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="size-6 text-primary" />
                </div>
                <CardTitle className="text-base">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {contact.address}
                  <br />
                  {contact.city}, {contact.country}
                </p>
              </CardContent>
            </Card>
          </CardHover>

          <CardHover>
            <Card className="h-full text-center">
              <CardHeader className="items-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="size-6 text-primary" />
                </div>
                <CardTitle className="text-base">Office Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sunday: 7:00 AM – 12:00 PM
                  <br />
                  Wed – Fri: Evenings
                  <br />
                  Saturday: Mornings
                </p>
              </CardContent>
            </Card>
          </CardHover>
        </div>
      </Section>

      {/* Contact Form */}
      <Section variant="warm">
        <div className="mx-auto max-w-2xl">
          <SectionHeading
            title="Send Us a Message"
            description="Fill out the form below and we'll get back to you as soon as possible."
            icon={Mail}
          />
          <div className="mt-10">
            <ContactForm />
          </div>
        </div>
      </Section>

      {/* Location */}
      <Section>
        <SectionHeading
          title="Find Us"
          description="Visit us in person. We'd love to welcome you."
          icon={MapPin}
        />
        <div className="mt-12">
          <LocationSection showMap />
        </div>
      </Section>

      {/* Social Media */}
      <Section variant="primary">
        <div className="text-center">
          <SectionHeading
            title="Follow Us"
            description="Stay connected with our church community on social media."
            icon={MessageSquare}
          />
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {socialLinks.map(
              (social) =>
                social.href && (
                  <Button
                    key={social.name}
                    variant="outline"
                    size="lg"
                    asChild
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <social.icon className="mr-2 size-5" />
                      {social.name}
                    </a>
                  </Button>
                )
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
