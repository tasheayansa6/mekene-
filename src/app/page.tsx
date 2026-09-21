import Link from 'next/link';
import Image from 'next/image';
import {
  Church,
  Heart,
  BookOpen,
  CalendarDays,
  ImageIcon,
  HandHeart,
  ArrowRight,
  MapPin,
  Users,
  Cross,
  Flame,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { LocationSection } from '@/components/sections/LocationSection';
import { WelcomeSection } from '@/components/sections/WelcomeSection';
import { getHomeCmsContent } from '@/lib/content/public';
import { getHomeSermon } from '@/lib/sermons/public';
import { getHomeEvents } from '@/lib/events/public';
import { getHomeGallery } from '@/lib/gallery/public';
import { getLiveNow } from '@/lib/live/public';
import { LiveNowBanner } from '@/components/live/LiveNowBanner';
import { isHomepageSectionEnabled } from '@/lib/cms/homepage-sections';

export const revalidate = 60;

// Placeholder data for modules that are not part of this phase.

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

// ============================================================
// Page Component
// ============================================================

export default async function HomePage() {
  const { branding } = churchConfig;
  const cms = await getHomeCmsContent();
  const homeNews = cms.featuredNews.length ? cms.featuredNews : cms.latestNews;
  const homeSermon = await getHomeSermon();
  const homeEvents = await getHomeEvents(4);
  const homeGallery = await getHomeGallery();
  const liveNow = await getLiveNow();
  const homepageSections = cms.homepageSections;
  const show = (key: string) => isHomepageSectionEnabled(homepageSections, key);

  return (
    <div className="page-transition">
      {/* ─── 1. HERO ─── */}
      {show('hero') ? (
      <Hero
        title="Welcome to Busa Mekene Eyasus Church"
        subtitle="Ethiopian Evangelical Church Mekane Yesus"
        description="Growing Together in Faith, Love and Service."
        primaryCta={{ label: 'Join Us', href: '/about' }}
        secondaryCta={{ label: 'Watch Sermons', href: '/sermons' }}
        imageUrl="/images/hero-church.jpg"
        variant="full"
      />
      ) : null}

      {liveNow?.isLive ? (
        <LiveNowBanner
          title={liveNow.title}
          slug={liveNow.slug}
          displayStatus={liveNow.displayStatus}
        />
      ) : null}

      {/* ─── 2. WELCOME (dynamic from API, fallback to config) ─── */}
      {show('welcome') ? <WelcomeSection /> : null}

      {/* ─── 3. SERVICE TIMES (dynamic from API, fallback to config) ─── */}
      {show('services') ? <ServiceTimesSection variant="warm" /> : null}

      {/* ─── 4. ABOUT CHURCH ─── */}
      {show('about') ? (
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
      ) : null}

      {/* ─── 5. LATEST SERMON ─── */}
      {show('featured_sermon') && homeSermon ? (
        <Section variant="warm" id="sermons">
          <SectionHeading
            title={homeSermon.isFeatured ? 'Featured Sermon' : 'Latest Sermon'}
            icon={BookOpen}
            description="Be encouraged by the Word"
          />
          <div className="mx-auto mt-10 max-w-3xl">
            <SermonCard
              title={homeSermon.title}
              speaker={homeSermon.speakerName}
              date={new Date(homeSermon.sermonDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              description={homeSermon.description}
              thumbnailUrl={homeSermon.thumbnailUrl}
              thumbnailAlt={homeSermon.thumbnailAlt}
              href={`/sermons/${homeSermon.slug}`}
              hasAudio={homeSermon.hasAudio}
              hasVideo={Boolean(homeSermon.video)}
            />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {homeSermon.video ? (
              <Button asChild>
                <Link href={`/sermons/${homeSermon.slug}`}>Watch</Link>
              </Button>
            ) : null}
            {homeSermon.hasAudio ? (
              <Button variant="outline" asChild>
                <Link href={`/sermons/${homeSermon.slug}`}>Listen</Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/sermons">
                View All Sermons
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {show('featured_events') && homeEvents.length > 0 ? (
      <Section id="events">
        <SectionHeading
          title="Upcoming Events"
          icon={CalendarDays}
          description="Published events from the church calendar"
        />
        <div className="mt-10 space-y-4 max-w-3xl mx-auto stagger-fade-in">
          {homeEvents.map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              date={event.startAt}
              endDate={event.endAt}
              location={event.location?.name}
              description={event.shortDescription || undefined}
              isRecurring={event.recurrence !== 'none'}
              href={`/events/${event.slug}`}
              timeZone={event.timezone}
              cancelled={event.status === 'cancelled'}
              isOnline={event.isOnline}
            />
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
      ) : null}

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

      {(show('latest_news') || show('featured_news')) && homeNews.length > 0 ? (
        <Section id="news">
          <SectionHeading
            title="Latest News"
            icon={Church}
            description="Published updates from our church"
          />
          <div className="mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 mx-auto stagger-fade-in">
            {homeNews.map((news) => (
              <NewsCard
                key={news.slug}
                title={news.title}
                content={news.excerpt || ''}
                date={news.publishedAt ? new Date(news.publishedAt).toLocaleDateString() : ''}
                imageUrl={news.featuredImageUrl || undefined}
                href={`/news/${news.slug}`}
                author={'author' in news && news.author ? news.author.name : undefined}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/news">
                All News
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {show('announcements') && cms.announcements.length > 0 ? (
        <Section variant="warm" id="announcements">
          <SectionHeading
            title="Important Announcements"
            icon={Church}
            description="Currently active featured announcements"
          />
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {cms.announcements.map((item) => (
              <Link
                key={item.slug}
                href="/announcements"
                className="block rounded-xl border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <h3 className="font-semibold text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {show('featured_resources') && cms.featuredResources.length > 0 ? (
        <Section id="resources">
          <SectionHeading
            title="Featured Resources"
            icon={BookOpen}
            description="Published study materials and documents"
          />
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {cms.featuredResources.map((item) => (
              <Link
                key={item.slug}
                href="/resources"
                className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <h3 className="font-semibold text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

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
      {(show('give_cta') || show('cta')) ? (
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
      ) : null}

      {show('gallery') && (homeGallery.latestPhotos.length || homeGallery.featuredAlbum) ? (
      <Section variant="warm" id="gallery">
        <SectionHeading
          title="Explore Our Gallery"
          icon={ImageIcon}
          description="Published photos from church life"
        />
        <div className="mt-10 grid gap-4 grid-cols-2 lg:grid-cols-4 stagger-fade-in">
          {homeGallery.latestPhotos.map((img) =>
            img ? (
              <GalleryCard
                key={img.id}
                title={img.title}
                imageUrl={img.thumbnailUrl || img.fileUrl}
                altText={img.altText || img.title}
                description={img.caption || undefined}
                albumName={img.album?.title}
                href={img.album ? `/gallery/${img.album.slug}` : '/gallery'}
              />
            ) : null
          )}
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
      ) : null}

      {show('contact') ? (
      <>
      {/* ─── 12. LOCATION (dynamic from API, fallback to config) ─── */}
      <Section id="location">
        <SectionHeading
          title="Find Us"
          icon={MapPin}
          description="We would love to welcome you in person"
        />
        <div className="mt-10">
          <LocationSection />
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
      </>
      ) : null}

      {/* ─── 14. FOOTER (handled by layout) ─── */}
    </div>
  );
}
