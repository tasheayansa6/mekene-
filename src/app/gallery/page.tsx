import type { Metadata } from 'next';
import { Camera } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import type { GalleryImage } from '@/components/gallery/GalleryGrid';

export const metadata: Metadata = {
  title: 'Photo Gallery | Busa Mekenene Eyasus Church',
  description:
    'Browse photos from Busa Mekenene Eyasus Church — worship services, community events, youth activities, and more.',
};

const galleryImages: GalleryImage[] = [
  {
    title: 'Sunday Divine Liturgy',
    imageUrl: '/images/hero-church.jpg',
    description: 'The congregation gathered for Sunday worship',
    album: 'Worship Services',
  },
  {
    title: 'Choir Performance',
    imageUrl: '/images/hero-church.jpg',
    description: 'Our choir leading worship through sacred hymns',
    album: 'Worship Services',
  },
  {
    title: 'Baptism Ceremony',
    imageUrl: '/images/hero-church.jpg',
    description: 'A holy baptism ceremony at our church',
    album: 'Worship Services',
  },
  {
    title: 'Community Outreach',
    imageUrl: '/images/hero-church.jpg',
    description: 'Serving our community through food distribution',
    album: 'Community',
  },
  {
    title: 'Church Fellowship',
    imageUrl: '/images/hero-church.jpg',
    description: 'Fellowship and meal after Sunday service',
    album: 'Community',
  },
  {
    title: 'Youth Retreat',
    imageUrl: '/images/hero-church.jpg',
    description: 'Young people at our annual youth retreat',
    album: 'Youth',
  },
  {
    title: 'Youth Bible Study',
    imageUrl: '/images/hero-church.jpg',
    description: 'Weekly Bible study session for young adults',
    album: 'Youth',
  },
  {
    title: 'Church Exterior',
    imageUrl: '/images/hero-church.jpg',
    description: 'The beautiful exterior of our church building',
    album: 'Church Building',
  },
  {
    title: 'Church Interior',
    imageUrl: '/images/hero-church.jpg',
    description:
      'The sanctuary interior with traditional Ethiopian Orthodox design',
    album: 'Church Building',
  },
];

export default function GalleryPage() {
  return (
    <div className="page-transition">
      {/* Hero */}
      <PageHero
        title="Photo Gallery"
        subtitle="Our Church in Pictures"
        description="Explore moments of worship, fellowship, and community life captured through the lens."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Gallery' },
        ]}
      />

      {/* Gallery Grid with Filtering & Lightbox */}
      <Section>
        <SectionHeading
          title="Browse Our Gallery"
          description="Click on any photo to view it in full size."
          icon={Camera}
        />
        <div className="mt-12">
          <GalleryGrid images={galleryImages} />
        </div>
      </Section>
    </div>
  );
}
