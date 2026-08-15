import type { Metadata } from 'next';
import { Church, Cross, Heart } from 'lucide-react';

import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { churchConfig } from '@/config/church';

export const metadata: Metadata = {
  title: 'About Our Church | Busa Mekenene Eyasus Church',
  description: `Learn about ${churchConfig.branding.name} — our mission, faith, and community.`,
};

export default function AboutPage() {
  const { branding, denomination } = churchConfig;

  return (
    <>
      <Section variant="warm">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary md:text-4xl">
            {branding.name}
          </h1>
          {branding.nameNative && (
            <p className="mt-2 text-lg text-muted-foreground">
              {branding.nameNative}
            </p>
          )}
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {branding.tagline}
          </p>
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <p className="text-lg leading-relaxed text-foreground">
            {branding.description}
          </p>
          {denomination && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Cross className="size-4" />
              <span>{denomination}</span>
            </div>
          )}
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Church className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Worship</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Rooted in the ancient traditions of the Ethiopian Orthodox Tewahedo Church
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Heart className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Community</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A welcoming family of believers growing together in faith and love
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Cross className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Service</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Dedicated to serving others in the name of Jesus Christ
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
