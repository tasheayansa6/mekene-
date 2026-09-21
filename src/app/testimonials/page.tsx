import type { Metadata } from 'next';
import Image from 'next/image';
import { MessageSquare } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { Card, CardContent } from '@/components/ui/card';
import { getPublicTestimonialBundle } from '@/lib/cms/search';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: 'Testimonials',
    description: 'Stories from members who have shared their experience with our church community.',
    path: '/testimonials',
  });
}

export default async function TestimonialsPage() {
  const testimonials = await getPublicTestimonialBundle();

  return (
    <div className="page-transition">
      <PageHero
        title="Testimonials"
        subtitle="Stories"
        description="Member stories shared with permission."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Testimonials' },
        ]}
      />
      <Section>
        <SectionHeading icon={MessageSquare} title="What people are saying" />
        {testimonials.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            No testimonials have been published yet.
          </p>
        ) : (
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
            {testimonials.map((item) => (
              <Card key={item.id} className="border-border/60">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {item.photoUrl ? (
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={item.photoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : null}
                    <div>
                      <p className="font-semibold text-primary">{item.name}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
