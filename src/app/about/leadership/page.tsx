import type { Metadata } from 'next';
import { Users } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardHover } from '@/components/cards/CardHover';

export const metadata: Metadata = {
  title: 'Leadership | Busa Mekene Eyasus Church',
  description:
    'Meet the dedicated leaders who serve and guide the Busa Mekene Eyasus Church community.',
};

const leaders = [
  {
    name: 'Father Samuel Tesfaye',
    position: 'Senior Priest',
    bio: '[Placeholder: Official biography pending verification]',
  },
  {
    name: 'Deacon Daniel Tadesse',
    position: 'Head Deacon',
    bio: '[Placeholder: Official biography pending verification]',
  },
  {
    name: "Sister Martha Kebede",
    position: "Women's Fellowship Leader",
    bio: '[Placeholder: Official biography pending verification]',
  },
  {
    name: 'Brother Yohannes Alemu',
    position: 'Youth Ministry Coordinator',
    bio: '[Placeholder: Official biography pending verification]',
  },
  {
    name: 'Sister Ruth Haile',
    position: 'Sunday School Director',
    bio: '[Placeholder: Official biography pending verification]',
  },
  {
    name: 'Brother Tadesse Girma',
    position: 'Choir Director',
    bio: '[Placeholder: Official biography pending verification]',
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .filter((word) => !word.startsWith('(') && !word.startsWith('['))
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

const avatarColors = [
  'bg-primary/15 text-primary',
  'bg-secondary/20 text-secondary-foreground',
  'bg-primary/10 text-primary',
  'bg-secondary/15 text-secondary-foreground',
  'bg-primary/20 text-primary',
  'bg-secondary/10 text-secondary-foreground',
];

export default function LeadershipPage() {
  return (
    <div className="page-transition">
      {/* Hero */}
      <PageHero
        title="Our Leadership"
        subtitle="Church Leadership"
        description="Meet the faithful servants who guide and shepherd our congregation."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about' },
          { label: 'Leadership' },
        ]}
      />

      {/* Intro */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            title="Guided by Faith"
            description="Our leadership team is composed of dedicated men and women who serve the church community with humility, wisdom, and devotion."
            icon={Users}
          />
          <p className="mt-4 text-muted-foreground">
            [Placeholder: Official leadership description pending verification] —
            The Ethiopian Evangelical Church Mekane Yesus has a rich organizational
            structure. Our local leadership works under the guidance of the
            denomination leadership.
          </p>
        </div>
      </Section>

      {/* Leaders Grid */}
      <Section variant="warm">
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-fade-in">
          {leaders.map((leader, index) => (
            <CardHover key={leader.name}>
              <Card className="h-full text-center">
                <CardHeader className="items-center">
                  {/* Avatar placeholder */}
                  <div
                    className={`flex size-20 items-center justify-center rounded-full text-2xl font-bold ${avatarColors[index % avatarColors.length]}`}
                  >
                    {getInitials(leader.name)}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{leader.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {leader.position}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{leader.bio}</p>
                </CardContent>
              </Card>
            </CardHover>
          ))}
        </div>
      </Section>
    </div>
  );
}
