import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { churchConfig } from "@/config/church";

// ============================================================
// Quick Feature Cards
// ============================================================

const features = [
  {
    icon: BookOpen,
    title: "Sermons",
    description: "Listen to recent sermons and spiritual teachings from our church.",
    href: "/sermons",
  },
  {
    icon: CalendarDays,
    title: "Events",
    description: "Stay updated with upcoming church events and activities.",
    href: "/events",
  },
  {
    icon: Heart,
    title: "Prayer",
    description: "Submit your prayer requests and join our prayer community.",
    href: "/prayer",
  },
  {
    icon: HandHeart,
    title: "Giving",
    description: "Support the church through tithes, offerings, and donations.",
    href: "/giving",
  },
  {
    icon: ImageIcon,
    title: "Gallery",
    description: "Browse photos and memories from our church community.",
    href: "/gallery",
  },
  {
    icon: Church,
    title: "About Us",
    description: "Learn about our faith, history, and the Ethiopian Orthodox Tewahedo Church.",
    href: "/about",
  },
];

// ============================================================
// Page Component
// ============================================================

export default function HomePage() {
  const { branding, serviceTimes, contact } = churchConfig;

  return (
    <div className="page-transition">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        {/* Subtle background pattern */}
        <div className="ethiopian-cross-pattern absolute inset-0 opacity-30" />
        <div className="relative">
          <Container className="py-20 md:py-32 lg:py-40">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 flex items-center justify-center gap-2">
                <Church className="h-8 w-8 text-secondary" />
                <span className="text-sm font-medium uppercase tracking-widest text-secondary">
                  Ethiopian Orthodox Tewahedo Church
                </span>
              </div>
              <h1 className="mb-2 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                {branding.name}
              </h1>
              {branding.nameNative && (
                <p className="mb-6 text-lg text-primary-foreground/70 md:text-xl">
                  {branding.nameNative}
                </p>
              )}
              <div className="gold-accent-line mx-auto mb-8 w-48" />
              <p className="mb-10 text-lg text-primary-foreground/85 md:text-xl">
                {branding.tagline}
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  asChild
                >
                  <Link href="/about">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link href="/contact">Visit Us</Link>
                </Button>
              </div>
            </div>
          </Container>
        </div>
      </section>

      {/* Welcome Section */}
      <Section id="welcome">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary md:text-4xl">
            Welcome to Our Church
          </h2>
          <div className="gold-accent-line mx-auto mb-8 w-32" />
          <p className="text-lg leading-relaxed text-muted-foreground">
            {branding.description}
          </p>
          <div className="mt-8">
            <Button variant="link" className="text-primary" asChild>
              <Link href="/about">
                More About Us
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* Service Times Section */}
      <Section variant="warm" id="services">
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Clock className="h-6 w-6 text-secondary" />
            <h2 className="text-3xl font-bold text-primary md:text-4xl">
              Service Times
            </h2>
          </div>
          <div className="gold-accent-line mx-auto mb-4 w-32" />
          <p className="text-muted-foreground">
            Join us in worship and fellowship
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {serviceTimes.map((service) => (
            <Card
              key={`${service.day}-${service.name}`}
              className="border-border/50 text-center transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-primary">
                  {service.name}
                </CardTitle>
                <CardDescription className="font-medium text-secondary">
                  {service.day}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {service.time}
                </p>
                {service.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Explore Section */}
      <Section id="explore">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary md:text-4xl">
            Explore Our Church
          </h2>
          <div className="gold-accent-line mx-auto mb-4 w-32" />
          <p className="text-muted-foreground">
            Discover the different areas of our church life
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.title} href={feature.href} className="group">
                <Card className="h-full border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center text-sm font-medium text-primary">
                      Explore
                      <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* CTA Section */}
      <Section variant="primary" id="connect">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Join Our Community
          </h2>
          <div className="gold-accent-line mx-auto mb-6 w-32" />
          <p className="mb-8 text-lg text-primary-foreground/85">
            Whether you are a lifelong member or a first-time visitor, we welcome
            you with open arms. Come and experience the warmth and faith of our
            church family.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              asChild
            >
              <Link href="/contact">
                Get in Touch
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/prayer">Submit a Prayer Request</Link>
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}