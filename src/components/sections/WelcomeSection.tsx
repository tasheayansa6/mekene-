'use client';

import { Church } from 'lucide-react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { useChurchProfile } from '@/hooks/use-church-profile';
import { churchConfig } from '@/config/church';

export function WelcomeSection() {
  const { data: profile } = useChurchProfile();

  const description = profile?.description || churchConfig.branding.description;
  const welcomeMessage = profile?.welcomeMessage || null;

  return (
    <Section id="welcome">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading
          title="Welcome to Our Church"
          icon={Church}
          description={description}
        />
        {welcomeMessage && (
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {welcomeMessage}
          </p>
        )}
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
  );
}
