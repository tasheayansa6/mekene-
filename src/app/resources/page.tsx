import type { Metadata } from 'next';
import { BookOpen, FileText, BookMarked, Download, Info } from 'lucide-react';

import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { CardHover } from '@/components/cards/CardHover';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Resources | Busa Mekenene Eyasus Church',
  description:
    'Access spiritual resources, Bible study materials, sermon notes, publications, and downloadable content from Busa Mekenene Eyasus Church.',
};

const resourceCategories = [
  {
    title: 'Bible Study',
    description:
      'Access Bible study guides, reading plans, and study materials rooted in the Ethiopian Evangelical tradition. Deepen your understanding of Scripture through structured study resources.',
    icon: BookOpen,
    href: '#',
    note: 'Bible study materials are being compiled and will be available soon.',
  },
  {
    title: 'Sermon Notes',
    description:
      'Find sermon outlines, teaching notes, and discussion guides from recent services. Review and reflect on the messages shared during our Worship Service and teaching sessions.',
    icon: FileText,
    href: '#',
    note: 'Sermon notes will be uploaded after each service.',
  },
  {
    title: 'Publications',
    description:
      'Explore church publications, spiritual literature, and educational materials. Including writings on the lives of faithful believers, church history, and Christian theology.',
    icon: BookMarked,
    href: '#',
    note: 'Publications catalog is under development.',
  },
  {
    title: 'Downloads',
    description:
      'Download prayer books, liturgical calendars, church forms, and other useful resources. All materials are provided free of charge for personal and church use.',
    icon: Download,
    href: '#',
    note: 'Downloadable files will be added as they become available.',
  },
];

export default function ResourcesPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Resources"
        subtitle="Grow in Faith"
        description="Access spiritual materials, study guides, and publications to support your faith journey and deepen your understanding of the Ethiopian Evangelical tradition."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Resources' },
        ]}
      />

      {/* Resource Categories */}
      <Section variant="warm">
        <SectionHeading
          title="Browse by Category"
          description="Choose a category below to explore available resources."
        />

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2">
          {resourceCategories.map((category) => {
            const Icon = category.icon;
            return (
              <CardHover key={category.title}>
                <a href={category.href}>
                  <Card className="group h-full gap-0 py-0 transition-colors hover:border-primary/30 hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                          <Icon className="size-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">
                          {category.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="mt-2 leading-relaxed">
                        {category.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="border-t px-6 py-4">
                      {/* [PLACEHOLDER] Link to category detail page when implemented */}
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        Explore Resources
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </CardContent>
                  </Card>
                </a>
              </CardHover>
            );
          })}
        </div>
      </Section>

      {/* Coming Soon Notice */}
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Info className="size-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-primary">Coming Soon</h2>
          <div className="gold-accent-line mx-auto mt-3 w-16" />
          <p className="mt-4 text-lg text-muted-foreground">
            Resources are being compiled and will be available soon. Check back
            regularly for updates.
          </p>
        </div>
      </Section>
    </div>
  );
}
