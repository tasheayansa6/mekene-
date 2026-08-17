import Link from 'next/link';
import Image from 'next/image';
import {
  Church,
  Clock,
  Heart,
  BookOpen,
  CalendarDays,
  ImageIcon,
  HandHeart,
  ArrowRight,
  ChevronRight,
  MapPin,
  Play,
  Users,
  Cross,
  Flame,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { Hero } from '@/components/hero/Hero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { PrayerRequestForm } from '@/components/forms/PrayerRequestForm';
import { EventCard } from '@/components/cards/EventCard';
import { SermonCard } from '@/components/cards/SermonCard';
import { NewsCard } from '@/components/cards/NewsCard';
import { MinistryCard } from '@/components/cards/MinistryCard';
import { GalleryCard } from '@/components/cards/GalleryCard';
import { churchConfig } from '@/config/church';
import { ServiceTimesSection } from '@/components/sections/ServiceTimesSection';

// ============================================================
// Placeholder data (will be replaced by API data in future phases)
// ============================================================

const latestSermon = {
  title: 'The Power of Faith in Daily Life',
  speaker: 'Father Samuel',
  date: '2025-08-10',
  description:
    'Exploring how faith guides our everyday decisions and strengthens our relationship with God and our community.',
  videoUrl: '#',
};

const upcomingEvents = [
  {
    title: 'Sunday Worship Service',
    date: '2025-08-17',
    location: 'Main Sanctuary',
    description: 'Weekly Sunday worship with the Worship Service.',
  },
  {
    title: 'Youth Fellowship Gathering',
    date: '2025-08-20',
    location: 'Church Hall',
    description: 'A time of worship, fellowship, and Bible study for young adults.',
  },
  {
    title: 'Community Outreach Day',
    date: '2025-08-24',
    location: 'Community Center',
    description: 'Serving our neighbors through food distribution and fellowship.',
  },
];

const ministries = [
  {
    name: 'Choir & Music',
    description: 'Leading the congregation in worship through sacred Ethiopian hymns and spiritual songs.',
    leaderName: 'Deacon Daniel',
    memberCount: 24,
    href: '/ministries',
  },
  {
    name: 'Youth Ministry',
    description: 'Empowering young people to grow in faith, leadership, and service to the community.',
    leaderName: 'Sister Martha',
    memberCount: 45,
    href: '/ministries',
  },
  {
    name: 'Women\'s Fellowship',
    description: 'A supportive community for women to connect, pray, and serve together.',
    leaderName: 'Sister Ruth',
    memberCount: 38,
    href: '/ministries',
  },
];

const latestNews = [
  {
    title: 'Annual Church Conference Scheduled',
    content:
      'We are excited to announce our annual church conference coming this September. Join us for three days of worship, teaching, and fellowship.',
    date: '2025-08-12',
    author: 'Church Office',
    priority: 'high' as const,
  },
  {
    title: 'New Sunday School Curriculum',
    content:
      'Our Sunday School program has been updated with new materials for all age groups. Registration is now open for the new term.',
    date: '2025-08-08',
    author: 'Education Team',
    priority: 'medium' as const,
  },
];

const galleryImages = [
  {
    title: 'Sunday Worship',
    imageUrl: '/images/hero-church.jpg',
    description: 'Our community gathered in worship',
    albumName: 'Worship Services',
  },
  {
    title: 'Church Building',
    imageUrl: '/images/hero-church.jpg',
    description: 'The beautiful interior of our sanctuary',
    albumName: 'Our Church',
  },
  {
    title: 'Community Event',
    imageUrl: '/images/hero-church.jpg',
    description: 'Fellowship after Sunday service',
    albumName: 'Community',
  },
  {
    title: 'Youth Gathering',
    imageUrl: '/images/hero-church.jpg',
    description: 'Young people in prayer and worship',
    albumName: 'Youth Ministry',
  },
];

// ============================================================
// Page Component
// ============================================================

export default function HomePage() {
  const { branding, contact } = churchConfig;

  return (
    <div className="page-transition">
      {/* ─── 1. HERO ─── */}
      <Hero
        title="Welcome to Busa Mekenene Eyasus Church"
        subtitle="Ethiopian Evangelical Church Mekane Yesus"
        description="Growing Together in Faith, Love and Service."
        primaryCta={{ label: 'Join Us', href: '/about' }}
        secondaryCta={{ label: 'Watch Sermons', href: '/sermons' }}
        imageUrl="/images/hero-church.jpg"
        variant="full"
      />

      {/* ─── 2. WELCOME ─── */}
      <Section id="welcome">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title="Welcome to Our Church"
            icon={Church}
            description={branding.description}
          />
          <div className="mt-8">
            <Button variant="link" className="text-primary" asChild>
              <Link href="/about">
                More About Us
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ─── 3. SERVICE TIMES (dynamic from API, fallback to config) ─── */}
      <ServiceTimesSection variant="warm" />

      {/* ─── 4. ABOUT CHURCH ─── */}
      <Section id="about">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Image Side */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src="/images/hero-church.jpg"
              alt={`${branding.name} sanctuary`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-primary/10" />
          </div>
          {/* Text Side */}
          <div>
            <SectionHeading
              title="Our Church"
              icon={Cross}
              align="left"
            />
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Rooted in the rich traditions of the Ethiopian Evangelical Church Mekane Yesus,
              our community has been a place of worship, spiritual growth, and fellowship.
              We are committed to preserving our faith heritage while nurturing the next
              generation of believers.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Flame className="size-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Worship</p>
                <p className="text-xs text-muted-foreground">In Spirit & Truth</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="size-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Community</p>
                <p className="text-xs text-muted-foreground">Growing Together</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="size-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Service</p>
                <p className="text-xs text-muted-foreground">Serving Others</p>
              </div>
            </div>
            <Button className="mt-8" asChild>
              <Link href="/about">
                Learn Our Story
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ─── 5. LATEST SERMON ─── */}
      <Section variant="warm" id="sermons">
        <SectionHeading
          title="Latest Sermon"
          icon={BookOpen}
          description="Be encouraged by the Word"
        />
        <div className="mx-auto mt-10 max-w-3xl">
          <SermonCard {...latestSermon} />
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/sermons">
              View All Sermons
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ─── 6. UPCOMING EVENTS ─── */}
      <Section id="events">
        <SectionHeading
          title="Upcoming Events"
          icon={CalendarDays}
          description="What is happening at our church"
        />
        <div className="mt-10 space-y-4 max-w-3xl mx-auto stagger-fade-in">
          {upcomingEvents.map((event) => (
            <EventCard key={event.title} {...event} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/events">
              View All Events
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ─── 7. MINISTRIES ─── */}
      <Section variant="warm" id="ministries">
        <SectionHeading
          title="Our Ministries"
          icon={Users}
          description="Serving God through dedicated service"
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-fade-in">
          {ministries.map((ministry) => (
            <MinistryCard key={ministry.name} {...ministry} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/ministries">
              All Ministries
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ─── 8. LATEST NEWS ─── */}
      <Section id="news">
        <SectionHeading
          title="Latest News"
          icon={Church}
          description="Stay informed about our community"
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto stagger-fade-in">
          {latestNews.map((news) => (
            <NewsCard key={news.title} {...news} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/news">
              All Announcements
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ─── 9. PRAYER REQUEST ─── */}
      <Section variant="primary" id="prayer">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            title="Prayer Requests"
            icon={Heart}
            description="We believe in the power of prayer. Share your prayer needs with us and our community will lift you up."
          />
        </div>
        <div className="mx-auto mt-10 max-w-lg">
          <Card className="border-primary-foreground/20 bg-primary-foreground/5">
            <CardContent className="pt-6">
              <PrayerRequestForm />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ─── 10. GIVING ─── */}
      <Section id="giving">
        <SectionHeading
          title="Support Our Mission"
          icon={HandHeart}
          description="Your generous giving helps us serve our community and spread the message of hope."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          <Card className="border-border/50 text-center card-hover">
            <CardHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-secondary/10">
                <HandHeart className="size-6 text-secondary" />
              </div>
              <CardTitle className="text-lg">Tithes & Offerings</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Give your tithes and offerings to support the work of the church.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-border/50 text-center card-hover">
            <CardHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-secondary/10">
                <Church className="size-6 text-secondary" />
              </div>
              <CardTitle className="text-lg">Building Fund</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Help us maintain and improve our church facilities.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-border/50 text-center card-hover">
            <CardHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-secondary/10">
                <Users className="size-6 text-secondary" />
              </div>
              <CardTitle className="text-lg">Community Help</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Support those in need within our church and local community.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 text-center">
          <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Link href="/giving">
              <HandHeart className="mr-2 size-4" />
              Give Now
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ─── 11. GALLERY ─── */}
      <Section variant="warm" id="gallery">
        <SectionHeading
          title="Photo Gallery"
          icon={ImageIcon}
          description="Moments from our church life"
        />
        <div className="mt-10 grid gap-4 grid-cols-2 lg:grid-cols-4 stagger-fade-in">
          {galleryImages.map((img) => (
            <GalleryCard key={img.title} {...img} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/gallery">
              View Full Gallery
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ─── 12. LOCATION ─── */}
      <Section id="location">
        <SectionHeading
          title="Find Us"
          icon={MapPin}
          description="We would love to welcome you in person"
        />
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Map Placeholder */}
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-muted">
            <div className="text-center">
              <MapPin className="mx-auto mb-3 size-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Interactive map will be displayed here</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Google Maps integration in Phase 3</p>
            </div>
          </div>
          {/* Contact Details */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Address</p>
                <p className="text-muted-foreground">
                  {contact.address}, {contact.city}, {contact.country}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Phone</p>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {contact.phone}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Email</p>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {contact.email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Main Service</p>
                <p className="text-muted-foreground">
                  Sunday 7:00 AM – 12:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── 13. CONTACT ─── */}
      <Section variant="primary" id="contact">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            title="Get in Touch"
            icon={Mail}
            description="Whether you have questions, need prayer, or want to learn more about our church, we are here for you."
          />
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              asChild
            >
              <Link href="/contact">
                Contact Us
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/prayer">Submit Prayer Request</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ─── 14. FOOTER (handled by layout) ─── */}
    </div>
  );
}
