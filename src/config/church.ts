/**
 * Church Branding & Configuration
 * 
 * Central configuration for Busa Mekenene Eyasus Church.
 * This will eventually be managed through the admin panel,
 * but for now serves as the single source of truth.
 */

export interface ChurchBranding {
  name: string;
  nameNative?: string;
  tagline: string;
  description: string;
  logo: string;
  favicon: string;
  ogImage?: string;
}

export interface ChurchContact {
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  mapUrl?: string;
}

export interface SocialMedia {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  telegram?: string;
  tiktok?: string;
}

export interface ServiceSchedule {
  day: string;
  time: string;
  name: string;
  description?: string;
}

export interface ChurchConfig {
  branding: ChurchBranding;
  contact: ChurchContact;
  social: SocialMedia;
  serviceTimes: ServiceSchedule[];
  founded?: string;
  denomination?: string;
  language?: string;
}

export const churchConfig: ChurchConfig = {
  branding: {
    name: 'Busa Mekenene Eyasus Church',
    nameNative: 'ቡሳ መኰንኔ ኢየሱስ ቤተክርስትያን',
    tagline: 'A House of Prayer, A Community of Faith',
    description:
      'Busa Mekenene Eyasus Church is a vibrant Ethiopian Orthodox Tewahedo Church community dedicated to worship, spiritual growth, and serving others in the name of Jesus Christ.',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
  contact: {
    email: 'info@busamekeneneeyasus.org',
    phone: '+251-XX-XXX-XXXX',
    address: 'Addis Ababa',
    city: 'Addis Ababa',
    country: 'Ethiopia',
  },
  social: {
    facebook: 'https://facebook.com/busamekeneneeyasus',
    youtube: 'https://youtube.com/@busamekeneneeyasus',
    telegram: 'https://t.me/busamekeneneeyasus',
  },
  serviceTimes: [
    {
      day: 'Sunday',
      time: '7:00 AM - 12:00 PM',
      name: 'Divine Liturgy',
      description: 'Main Sunday worship service with the Divine Liturgy',
    },
    {
      day: 'Wednesday',
      time: '6:00 PM - 8:00 PM',
      name: 'Midweek Prayer',
      description: 'Weekly prayer meeting and Bible study',
    },
    {
      day: 'Friday',
      time: '5:00 PM - 7:00 PM',
      name: 'Evening Vigil',
      description: 'Evening prayer and spiritual preparation',
    },
    {
      day: 'Saturday',
      time: '8:00 AM - 10:00 AM',
      name: 'Sunday School',
      description: 'Religious education for children and youth',
    },
  ],
  founded: 'Ethiopian Orthodox Tewahedo Church',
  denomination: 'Ethiopian Orthodox Tewahedo Church',
  language: 'Amharic',
};

/** Navigation links for the public website */
export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Ministries', href: '/ministries' },
  { label: 'Sermons', href: '/sermons' },
  { label: 'Events', href: '/events' },
  { label: 'News', href: '/news' },
  { label: 'Resources', href: '/resources' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
] as const;

export type NavLink = (typeof navLinks)[number];

/** Navigation links for the member dashboard */
export const memberNavLinks = [
  { label: 'Dashboard', href: '/member', icon: 'LayoutDashboard' },
  { label: 'My Profile', href: '/member/profile', icon: 'User' },
  { label: 'Announcements', href: '/member/announcements', icon: 'Bell' },
  { label: 'Events', href: '/member/events', icon: 'Calendar' },
  { label: 'Prayer', href: '/member/prayer', icon: 'Heart' },
  { label: 'Giving', href: '/member/giving', icon: 'HandHeart' },
  { label: 'Sermons', href: '/member/sermons', icon: 'BookOpen' },
  { label: 'Resources', href: '/member/resources', icon: 'FolderOpen' },
  { label: 'Notifications', href: '/member/notifications', icon: 'BellRing' },
  { label: 'Settings', href: '/member/settings', icon: 'Settings' },
] as const;

/** Navigation links for the admin dashboard */
export const adminNavLinks = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Members', href: '/admin/members', icon: 'Users' },
  { label: 'Sermons', href: '/admin/sermons', icon: 'BookOpen' },
  { label: 'Events', href: '/admin/events', icon: 'Calendar' },
  { label: 'Ministries', href: '/admin/ministries', icon: 'UsersRound' },
  { label: 'Prayer Requests', href: '/admin/prayer', icon: 'Heart' },
  { label: 'Donations', href: '/admin/donations', icon: 'HandHeart' },
  { label: 'Attendance', href: '/admin/attendance', icon: 'ClipboardCheck' },
  { label: 'Announcements', href: '/admin/announcements', icon: 'Megaphone' },
  { label: 'Gallery', href: '/admin/gallery', icon: 'ImageIcon' },
  { label: 'Resources', href: '/admin/resources', icon: 'FolderOpen' },
  { label: 'Reports', href: '/admin/reports', icon: 'BarChart3' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
] as const;
