'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock, MapPin, Share2 } from 'lucide-react';
import { ProfileTab } from './_components/ProfileTab';
import { ServicesTab } from './_components/ServicesTab';
import { LocationsTab } from './_components/LocationsTab';
import { SocialLinksTab } from './_components/SocialLinksTab';

export default function ChurchInfoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Church Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage church profile, service schedules, locations, and social media
          links.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <Building2 className="size-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Clock className="size-4" />
            <span className="hidden sm:inline">Services</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5">
            <MapPin className="size-4" />
            <span className="hidden sm:inline">Locations</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5">
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Social Links</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab />
        </TabsContent>
        <TabsContent value="locations">
          <LocationsTab />
        </TabsContent>
        <TabsContent value="social">
          <SocialLinksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
