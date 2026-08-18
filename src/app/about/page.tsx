import type { Metadata } from 'next';
import { headers } from 'next/headers';
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
  Star,
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
import {
  getChurchProfile,
  parseCoreValues,
  parseBeliefs,
  formatTimeRange,
  type ChurchProfileData,
  type CoreValue,
} from '@/lib/church-api';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const profile = await getChurchProfile(`${proto}://${host}`);

  const name = profile?.name || churchConfig.branding.name;
  const description =
    profile?.description ||
    churchConfig.branding.description ||
    `Learn about ${name} — our history, vision, mission, core values, beliefs, and worship information.`;

  return {
    title: `About Us | ${name}`,
    description,
    openGraph: {
      title: `About ${name}`,
      description,
      type: 'website',
    },
  };
}

// Fallback data when API is unavailable
const fallbackCoreValues: CoreValue[] = [
  { title: 'Faith', description: 'Rooted in the apostolic faith passed down through generations of Ethiopian Christian tradition.' },
  { title: 'Worship', description: 'Celebrating worship with reverence, following a rich liturgical heritage.' },
  { title: 'Community', description: 'Building a welcoming and supportive church family that cares for one another.' },
  { title: 'Service', description: 'Dedicated to serving those in need and being the hands and feet of Christ.' },
  { title: 'Education', description: 'Nurturing spiritual growth through Sunday school, Bible study, and religious education.' },
  { title: 'Unity', description: 'Strengthening the bonds of fellowship and unity within our congregation and beyond.' },
];

const fallbackTimeline = [
  { year: 'Founding Era', title: 'Church Established', description: 'The church was established to serve the local community in faith and worship.' },
  { year: 'Growth Phase', title: 'Community Expansion', description: 'The congregation grew as more families joined and new ministries were launched.' },
  { year: 'Development', title: 'Ministries & Programs Launched', description: 'Various ministries, educational programs, and outreach efforts were formally established.' },
  { year: 'Present Day', title: 'Continuing the Mission', description: 'Today, the church continues to serve the community with renewed vision and dedication.' },
];

const fallbackBeliefs = [
  { id: 'faith', title: 'Our Faith', content: 'We believe in one God — Father, Son, and Holy Spirit — and in salvation through Jesus Christ.' },
  { id: 'bible', title: 'The Bible', content: 'We hold the Bible as the inspired Word of God and the ultimate authority for faith and practice.' },
  { id: 'worship', title: 'Worship', content: 'We gather regularly for worship, prayer, and the proclamation of the Gospel.' },
  { id: 'community', title: 'Community', content: 'We believe the church is called to be a loving, supportive community that reflects Christ\'s love.' },
  { id: 'service', title: 'Service', content: 'We are called to serve our neighbors and share the love of Christ through acts of compassion.' },
];

// Icon resolver for core values
function getIcon(title: string): React.ComponentType<{ className?: string }> {
  const lower = title.toLowerCase();
  if (lower.includes('faith') || lower.includes('እምነት')) return Shield;
  if (lower.includes('worship')) return Church;
  if (lower.includes('communit') || lower.includes('ማኅበር')) return Users;
  if (lower.includes('service') || lower.includes('አገልግሎት')) return HandHeart;
  if (lower.includes('educat') || lower.includes('ትምህርት')) return GraduationCap;
  if (lower.includes('unit') || lower.includes('አንድነት')) return Link2;
  if (lower.includes('love') || lower.includes('ፍቅር')) return Heart;
  if (lower.includes('hope') || lower.includes('ተስፋ')) return Sparkles;
  return Star;
}

// Parse history text into timeline items
function parseHistoryTimeline(
  historyText: string | null
): Array<{ year: string; title: string; description: string }> {
  if (!historyText) return fallbackTimeline;
  // Try splitting by double newlines into sections
  const blocks = historyText.split(/\n\s*\n/).filter((b) => b.trim());
  if (blocks.length === 0) return fallbackTimeline;

  return blocks.map((block, i) => {
    const lines = block.trim().split('\n');
    const firstLine = lines[0]?.trim() ?? '';
    // Try to find a year/era marker at the start
    const yearMatch = firstLine.match(/^(\d{4}s?|\[.*?\]|[^:–—]+)/);
    const year = yearMatch ? yearMatch[1].replace(/^\[|\]$/g, '').trim() : `Phase ${i + 1}`;
    // Rest is the content
    const rest = lines.slice(1).join(' ').trim() || firstLine;
    return {
      year,
      title: year,
      description: rest,
    };
  });
}

export default async function AboutPage() {
  const { branding, denomination } = churchConfig;

  // Fetch profile data from API (server-side)
  let profile: ChurchProfileData | null = null;
  try {
    // Build absolute URL for server-side fetch
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const proto = headersList.get('x-forwarded-proto') || 'http';
    profile = await getChurchProfile(`${proto}://${host}`);
  } catch {
    // Silently fall back to default data
  }

  // Determine data sources
  const displayName = profile?.nameNative || branding.nameNative || null;
  const denom = profile?.denomination || denomination || null;
  const description = profile?.description || branding.description;
  const historyText = profile?.history || null;
  const visionText = profile?.vision || null;
  const missionText = profile?.mission || null;
  const worshipInfoText = profile?.worshipInfo || null;

  // Parse structured data
  const coreValues =
    parseCoreValues(profile?.coreValues).length > 0
      ? parseCoreValues(profile?.coreValues)
      : fallbackCoreValues;
  const beliefs =
    parseBeliefs(profile?.beliefs).length > 0
      ? parseBeliefs(profile?.beliefs)
      : fallbackBeliefs;
  const timeline = parseHistoryTimeline(historyText);

  // Service schedules
  const services =
    profile?.serviceSchedules && profile.serviceSchedules.length > 0
      ? profile.serviceSchedules
      : churchConfig.serviceTimes.map((s) => ({
          id: s.day + s.name,
          dayOfWeek: s.day,
          serviceName: s.name,
          startTime: s.time.split(' - ')[0] || s.time,
          endTime: s.time.includes(' - ') ? s.time.split(' - ')[1] : null,
          description: s.description || null,
          location: null,
          isActive: true,
          sortOrder: 0,
        }));

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
            title={profile?.name || branding.name}
            description={description}
            icon={Cross}
          />
          {displayName && (
            <p className="mt-2 text-xl font-medium text-primary/80">
              {displayName}
            </p>
          )}
          {denom && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-sm">
                <Cross className="mr-1.5 size-3.5" />
                {denom}
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
        {historyText ? (
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            {historyText}
          </p>
        ) : (
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Our church has a rich history of serving the community through worship, fellowship, and outreach.
          </p>
        )}
        <div className="relative mx-auto max-w-3xl">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 hidden h-full w-px bg-primary/20 md:left-1/2 md:block md:-translate-x-px" />

          <div className="space-y-8 md:space-y-12">
            {timeline.map((event, index) => (
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
                  {visionText ||
                    'To be a beacon of spiritual light, nurturing a thriving community of believers rooted in faith and radiating Christ\'s love to all nations.'}
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
                  {missionText ||
                    'To glorify God through worship, to edify believers through teaching and fellowship, to serve our neighbors through compassion and outreach, and to make disciples of all nations.'}
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
          {coreValues.map((value) => {
            const IconComponent = getIcon(value.title);
            return (
              <CardHover key={value.title}>
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <IconComponent className="size-6 text-primary" />
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
            );
          })}
        </div>
      </Section>

      {/* Beliefs */}
      <Section>
        <SectionHeading
          title="Our Beliefs"
          description="The foundational teachings that guide our faith."
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
          {services.map((service) => (
            <Card
              key={service.id}
              className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/20">
                    <Clock className="size-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-primary-foreground">
                      {service.serviceName}
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/70">
                      {service.dayOfWeek}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-secondary">
                  {formatTimeRange(service.startTime, service.endTime)}
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
        {worshipInfoText && (
          <div className="mx-auto mt-10 max-w-2xl text-center">
            <p className="text-sm text-primary-foreground/70">
              {worshipInfoText}
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}
