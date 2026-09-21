/**
 * Church Branding & Configuration
 * 
 * Central configuration for Busa Mekene Eyasus Church.
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
    name: 'Busa Mekene Eyasus Church',
    nameNative: 'ቡሳ መኰንኔ ኢየሱስ ቤተክርስትያን',
    tagline: 'A House of Prayer, A Community of Faith',
    description:
      'Busa Mekene Eyasus Church is a vibrant Ethiopian Evangelical Church Mekane Yesus community dedicated to worship, spiritual growth, and serving others in the name of Jesus Christ.',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
  contact: {
    email: 'info@busamekeneeyasus.org',
    phone: '+251-XX-XXX-XXXX',
    address: 'Addis Ababa',
    city: 'Addis Ababa',
    country: 'Ethiopia',
  },
  social: {
    facebook: 'https://facebook.com/busamekeneeyasus',
    youtube: 'https://youtube.com/@busamekeneeyasus',
    telegram: 'https://t.me/busamekeneeyasus',
  },
  serviceTimes: [
    {
      day: 'Sunday',
      time: '7:00 AM - 12:00 PM',
      name: 'Sunday Worship Service',
      description: 'Main Sunday worship service',
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
      name: 'Evening Prayer',
      description: 'Evening prayer and spiritual preparation',
    },
    {
      day: 'Saturday',
      time: '8:00 AM - 10:00 AM',
      name: 'Sunday School',
      description: 'Religious education for children and youth',
    },
  ],
  founded: 'Ethiopian Evangelical Church Mekane Yesus',
  denomination: 'Ethiopian Evangelical Church Mekane Yesus',
  language: 'Amharic',
};

/** Navigation links for the public website */
export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Ministries', href: '/ministries' },
  { label: 'Library', href: '/library' },
  { label: 'Sermons', href: '/sermons' },
  { label: 'Bible Study', href: '/bible-study' },
  { label: 'Events', href: '/events' },
  { label: 'Live', href: '/live' },
  { label: 'Services', href: '/services' },
  { label: 'News', href: '/news' },
  { label: 'Resources', href: '/resources' },
  { label: 'Prayer', href: '/prayer' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Announcements', href: '/announcements' },
  { label: 'Give', href: '/give' },
  { label: 'Contact', href: '/contact' },
] as const;

export type NavLink = (typeof navLinks)[number];

/** Navigation links for the member dashboard */
export const memberNavLinks = [
  { label: 'Dashboard', href: '/member', icon: 'LayoutDashboard' },
  { label: 'My Profile', href: '/member/profile', icon: 'User' },
  { label: 'Household', href: '/member/household', icon: 'Home' },
  { label: 'Announcements', href: '/member/announcements', icon: 'Bell' },
  { label: 'Events', href: '/member/events', icon: 'Calendar' },
  { label: 'Live Worship', href: '/live', icon: 'Radio' },
  { label: 'Prayer', href: '/member/prayer', icon: 'Heart' },
  { label: 'Giving', href: '/member/giving', icon: 'HandHeart' },
  { label: 'Volunteering', href: '/member/volunteering', icon: 'Users' },
  { label: 'Sermons', href: '/member/sermons', icon: 'BookOpen' },
  { label: 'My Library', href: '/member/library', icon: 'Library' },
  { label: 'Bookmarks', href: '/member/bookmarks', icon: 'Bookmark' },
  { label: 'Resources', href: '/member/resources', icon: 'FolderOpen' },
  { label: 'Notifications', href: '/member/notifications', icon: 'BellRing' },
  { label: 'Messages', href: '/member/messages', icon: 'MessageSquare' },
  { label: 'Settings', href: '/member/settings', icon: 'Settings' },
] as const;

/** Navigation links for the admin dashboard */
export const adminNavLinks = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', resource: null },
  { label: 'Users', href: '/admin/users', icon: 'Users', resource: 'users' },
  { label: 'Roles', href: '/admin/roles', icon: 'Shield', resource: 'roles' },
  { label: 'Permissions', href: '/admin/permissions', icon: 'KeyRound', resource: 'permissions' },
  { label: 'Members', href: '/admin/members', icon: 'Users', resource: 'users' },
  { label: 'Sermons', href: '/admin/sermons', icon: 'BookOpen', resource: 'sermons' },
  { label: 'Events', href: '/admin/events', icon: 'Calendar', resource: 'events' },
  { label: 'Ministries', href: '/admin/ministries', icon: 'UsersRound', resource: 'ministries' },
  { label: 'Prayer Requests', href: '/admin/prayer', icon: 'Heart', resource: 'prayer' },
  { label: 'Donations', href: '/admin/donations', icon: 'HandHeart', resource: 'finance' },
  { label: 'Attendance', href: '/admin/attendance', icon: 'ClipboardCheck', resource: 'users' },
  { label: 'Announcements', href: '/admin/announcements', icon: 'Megaphone', resource: 'content' },
  { label: 'Gallery', href: '/admin/gallery', icon: 'ImageIcon', resource: 'gallery' },
  { label: 'Resources', href: '/admin/resources', icon: 'FolderOpen', resource: 'content' },
  { label: 'Reports', href: '/admin/reports', icon: 'BarChart3', resource: 'finance' },
  { label: 'Church Info', href: '/admin/church', icon: 'Church', resource: 'church' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings', resource: 'settings' },
] as const;

export const ministryLeaderNavLinks = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'My Ministry', href: '/admin/ministries', icon: 'UsersRound' },
  { label: 'Events', href: '/admin/events', icon: 'Calendar' },
  { label: 'Announcements', href: '/admin/announcements', icon: 'Megaphone' },
] as const;

export const memberPortalLinks = [
  { label: 'Dashboard', href: '/member', icon: 'LayoutDashboard' },
  { label: 'Announcements', href: '/member/announcements', icon: 'Megaphone' },
  { label: 'Profile', href: '/member/profile', icon: 'User' },
  { label: 'Family', href: '/member/family', icon: 'Home' },
  { label: 'Membership', href: '/member/membership', icon: 'ClipboardCheck' },
  { label: 'Check-in', href: '/member/check-in', icon: 'ClipboardCheck' },
  { label: 'Attendance', href: '/member/attendance', icon: 'ClipboardCheck' },
  { label: 'Services', href: '/member/services', icon: 'Church' },
  { label: 'Events', href: '/member/events', icon: 'Calendar' },
  { label: 'Calendar', href: '/member/calendar', icon: 'Calendar' },
  { label: 'Live Worship', href: '/live', icon: 'Radio' },
  { label: 'Ministries', href: '/member/ministries', icon: 'UsersRound' },
  { label: 'Volunteering', href: '/member/volunteering', icon: 'Users' },
  { label: 'Leader teams', href: '/leader/volunteers', icon: 'UsersRound' },
  { label: 'Sermons', href: '/member/sermons', icon: 'BookOpen' },
  { label: 'Prayer', href: '/member/prayer', icon: 'Heart' },
  { label: 'Giving', href: '/member/giving', icon: 'HandHeart' },
  { label: 'Directory', href: '/member/directory', icon: 'Search' },
  { label: 'Notifications', href: '/member/notifications', icon: 'BellRing' },
  { label: 'Messages', href: '/member/messages', icon: 'MessageSquare' },
  { label: 'Settings', href: '/member/settings', icon: 'Settings' },
] as const;
