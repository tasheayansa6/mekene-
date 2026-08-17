import type { Metadata } from 'next';
import {
  Cross,
  Heart,
  BookOpen,
  Users,
  HandHeart,
  GraduationCap,
  Link2,
  Clock,
  Church,
  Eye,
  Target,
  Shield,
  Sparkles,
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
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { CardHover } from '@/components/cards/CardHover';

export const metadata: Metadata = {
  title: 'About Us | Busa Mekenene Eyasus Church',
  description:
    'Learn about Busa Mekenene Eyasus Church — our history, vision, mission, core values, beliefs, and worship information.',
};

const coreValues = [
  {
    icon: Shield,
    title: 'Faith',
    description:
      '[Placeholder: Official description pending verification] — Rooted in the ancient apostolic faith passed down through centuries of Ethiopian Orthodox tradition.',
  },
  {
    icon: Church,
    title: 'Worship',
    description:
      '[Placeholder: Official description pending verification] — Celebrating the Divine Liturgy with reverence, following the rich Ge\'ez liturgical heritage.',
  },
  {
    icon: Users,
    title: 'Community',
    description:
      '[Placeholder: Official description pending verification] — Building a welcoming and supportive church family that cares for one another.',
  },
  {
    icon: HandHeart,
    title: 'Service',
    description:
      '[Placeholder: Official description pending verification] — Dedicated to serving those in need and being the hands and feet of Christ.',
  },
  {
    icon: GraduationCap,
    title: 'Education',
    description:
      '[Placeholder: Official description pending verification] — Nurturing spiritual growth through Sunday school, Bible study, and religious education.',
  },
  {
    icon: Link2,
    title: 'Unity',
    description:
      '[Placeholder: Official description pending verification] — Strengthening the bonds of fellowship and unity within our congregation and beyond.',
  },
];

const timelineEvents = [
  {
    year: 'Founding Era',
    title: 'Church Established',
    description:
      '[Placeholder: Official church history will be added once verified by church leadership.]',
  },
  {
    year: 'Growth Phase',
    title: 'Community Expansion',
    description:
      '[Placeholder: Official church history will be added once verified by church leadership.]',
  },
  {
    year: 'Development',
    title: 'Ministries & Programs Launched',
    description:
      '[Placeholder: Official church history will be added once verified by church leadership.]',
  },
  {
    year: 'Present Day',
    title: 'Continuing the Mission',
    description:
      '[Placeholder: Official church history will be added once verified by church leadership.]',
  },
];

const beliefs = [
  {
    id: 'holy-trinity',
    title: 'The Holy Trinity',
    content:
      '[Placeholder: Official summary pending verification] — The Ethiopian Orthodox Tewahedo Church believes in one God in three persons: Father, Son, and Holy Spirit, co-equal and co-eternal.',
  },
  {
    id: 'nature-of-christ',
    title: 'The Nature of Christ (Miaphysitism)',
    content:
      '[Placeholder: Official summary pending verification] — We uphold the Miaphysite Christology, affirming that Christ has one united divine-human nature, as defined at the Council of Chalcedon.',
  },
  {
    id: 'the-bible',
    title: 'The Bible',
    content:
      '[Placeholder: Official summary pending verification] — The Ethiopian Orthodox Tewahedo Church recognizes a broader biblical canon of 81 books, including books accepted by the wider Orthodox tradition.',
  },
  {
    id: 'sacraments',
    title: 'Sacraments (Mysteries)',
    content:
      '[Placeholder: Official summary pending verification] — The church observes seven sacraments: Baptism, Confirmation (Chrismation), Holy Communion, Confession, Anointing of the Sick, Holy Orders, and Matrimony.',
  },
  {
    id: 'virgin-mary',
    title: 'The Virgin Mary',
    content:
      '[Placeholder: Official summary pending verification] — The Virgin Mary (Kidane Mehret) holds a central place in Ethiopian Orthodox devotion as the Theotokos (God-bearer).',
  },
  {
    id: 'saints-intercession',
    title: 'Saints & Intercession',
    content:
      '[Placeholder: Official summary pending verification] — The church honors the saints and believes in their intercession, with special reverence for Ethiopian saints.',
  },
];

export default function AboutPage() {
  const { branding, denomination, language, serviceTimes } = churchConfig;

  return (
    <div className="page-transition">
      {/* Hero */}
      <PageHero
        title="About Us"
        subtitle="Our Church"
        description="Discover the faith, history, and community that make Busa Mekenene Eyasus Church a home for worshippers."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]}
      />

      {/* Church Introduction */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title={branding.name}
            description={branding.description}
            icon={Cross}
          />
          {branding.nameNative && (
            <p className="mt-2 text-xl font-medium text-primary/80">
              {branding.nameNative}
            </p>
          )}
          {denomination && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-sm">
                <Cross className="mr-1.5 size-3.5" />
                {denomination}
              </Badge>
            </div>
          )}
        </div>
      </Section>

      {/* History */}
      <Section variant="warm">
        <SectionHeading
          title="Our History"
          description="A journey of faith, growth, and service to the community."
          icon={BookOpen}
        />
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          [Placeholder: Official church history will be added once verified by
          church leadership.]
        </p>
        <div className="relative mx-auto max-w-3xl">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 hidden h-full w-px bg-primary/20 md:left-1/2 md:block md:-translate-x-px" />

          <div className="space-y-8 md:space-y-12">
            {timelineEvents.map((event, index) => (
              <div
                key={index}
                className={cn(
                  'relative flex flex-col md:flex-row md:items-center',
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                )}
              >
                {/* Dot */}
                <div className="absolute left-4 top-0 z-10 hidden h-3 w-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background md:left-1/2 md:block" />

                {/* Content card */}
                <div
                  className={cn(
                    'md:w-1/2',
                    index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'
                  )}
                >
                  <Card className="border-l-4 border-l-primary/30">
                    <CardHeader className="pb-2">
                      <Badge variant="outline" className="w-fit text-xs">
                        {event.year}
                      </Badge>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Spacer for opposite side */}
                <div className="hidden md:block md:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Vision & Mission */}
      <Section>
        <SectionHeading
          title="Vision & Mission"
          description="Guided by faith, driven by purpose."
          icon={Target}
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2">
          <CardHover>
            <Card className="h-full border-t-4 border-t-secondary">
              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Eye className="size-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  [Placeholder: Official vision statement pending verification] —
                  To be a beacon of spiritual light in Addis Ababa, nurturing a
                  thriving community of believers rooted in the ancient faith of
                  the Ethiopian Orthodox Tewahedo Church, and radiating Christ\'s
                  love to all nations.
                </p>
              </CardContent>
            </Card>
          </CardHover>

          <CardHover>
            <Card className="h-full border-t-4 border-t-primary">
              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Target className="size-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  [Placeholder: Official mission statement pending verification] —
                  To glorify God through worship, to edify believers through
                  teaching and fellowship, to serve our neighbors through compassion
                  and outreach, and to make disciples of all nations in the
                  tradition of the Ethiopian Orthodox Tewahedo Church.
                </p>
              </CardContent>
            </Card>
          </CardHover>
        </div>
      </Section>

      {/* Core Values */}
      <Section variant="warm">
        <SectionHeading
          title="Our Core Values"
          description="The principles that guide our community of faith."
          icon={Sparkles}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coreValues.map((value) => (
            <CardHover key={value.title}>
              <Card className="h-full text-center">
                <CardHeader>
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <value.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            </CardHover>
          ))}
        </div>
      </Section>

      {/* Beliefs */}
      <Section>
        <SectionHeading
          title="Our Beliefs"
          description="The foundational teachings of the Ethiopian Orthodox Tewahedo Church."
          icon={BookOpen}
        />
        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {beliefs.map((belief) => (
              <AccordionItem key={belief.id} value={belief.id}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {belief.title}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{belief.content}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* Worship Information */}
      <Section variant="primary">
        <SectionHeading
          title="Worship Information"
          description="Join us in prayer and praise throughout the week."
          icon={Clock}
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
          {serviceTimes.map((service) => (
            <Card
              key={service.name}
              className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/20">
                    <Clock className="size-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-primary-foreground">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/70">
                      {service.day}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-secondary">
                  {service.time}
                </p>
                {service.description && (
                  <p className="mt-2 text-sm text-primary-foreground/70">
                    {service.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-sm text-primary-foreground/70">
            All services are conducted primarily in{' '}
            <span className="font-semibold text-secondary">Ge&apos;ez</span>{' '}
            (the ancient liturgical language) and{' '}
            <span className="font-semibold text-secondary">Amharic</span>,
            following the Ethiopian liturgical calendar with its unique cycles of
            fasting and feasting.
          </p>
        </div>
      </Section>
    </div>
  );
}

