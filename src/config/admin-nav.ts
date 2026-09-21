export interface AdminNavItem {
  label: string;
  href?: string;
  icon: string;
  resource?: string | null;
  comingSoon?: boolean;
  children?: AdminNavItem[];
}

export const adminNavigation: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', resource: null },
  {
    label: 'Church',
    icon: 'Church',
    resource: 'church',
    children: [
      { label: 'Church Information', href: '/admin/church', icon: 'Building2', resource: 'church' },
      { label: 'Service Times', href: '/admin/church/services', icon: 'Clock', resource: 'church' },
      { label: 'Locations', href: '/admin/church/locations', icon: 'MapPin', resource: 'church' },
      { label: 'Social Links', href: '/admin/church/social-links', icon: 'Share2', resource: 'church' },
    ],
  },
  {
    label: 'Leadership',
    icon: 'UserRoundCog',
    resource: 'leadership',
    children: [
      { label: 'Leaders', href: '/admin/leadership', icon: 'Users', resource: 'leadership' },
      { label: 'Positions', href: '/admin/leadership/positions', icon: 'Briefcase', resource: 'leadership' },
    ],
  },
  {
    label: 'Governance',
    icon: 'Shield',
    resource: 'governance',
    children: [
      { label: 'Overview', href: '/admin/governance', icon: 'LayoutDashboard', resource: 'governance' },
      {
        label: 'Leadership history',
        href: '/admin/governance/leadership/history',
        icon: 'ScrollText',
        resource: 'governance',
      },
      { label: 'Committees', href: '/admin/governance', icon: 'UsersRound', resource: 'governance' },
      { label: 'Reports', href: '/admin/governance/reports', icon: 'BarChart3', resource: 'governance' },
    ],
  },
  {
    label: 'Ministries',
    icon: 'UsersRound',
    resource: 'ministries',
    children: [
      { label: 'All Ministries', href: '/admin/ministries', icon: 'UsersRound', resource: 'ministries' },
      { label: 'Categories', href: '/admin/ministries/categories', icon: 'Tags', resource: 'ministries' },
      { label: 'Teams', href: '/admin/ministry/teams', icon: 'Users', resource: 'ministries' },
      {
        label: 'Assignments',
        href: '/admin/ministry/assignments',
        icon: 'ClipboardList',
        resource: 'ministries',
      },
      { label: 'Rosters', href: '/admin/ministry/rosters', icon: 'Calendar', resource: 'ministries' },
      { label: 'Training', href: '/admin/ministry/training', icon: 'BookOpen', resource: 'ministries' },
      { label: 'Reports', href: '/admin/ministry/reports', icon: 'BarChart3', resource: 'ministries' },
    ],
  },
  {
    label: 'Staff',
    icon: 'Briefcase',
    resource: 'staff',
    children: [
      { label: 'Directory', href: '/admin/staff/directory', icon: 'Users', resource: 'staff' },
    ],
  },
  {
    label: 'Volunteers',
    icon: 'HandHeart',
    resource: 'volunteers',
    children: [
      { label: 'All', href: '/admin/volunteers', icon: 'Users', resource: 'volunteers' },
      {
        label: 'Applications',
        href: '/admin/volunteers/applications',
        icon: 'ClipboardList',
        resource: 'volunteers',
      },
      {
        label: 'Schedule',
        href: '/admin/volunteers/schedule',
        icon: 'Calendar',
        resource: 'volunteers',
      },
      {
        label: 'Roles',
        href: '/admin/volunteers/roles',
        icon: 'Tags',
        resource: 'volunteers',
      },
      {
        label: 'Reports',
        href: '/admin/volunteers/reports',
        icon: 'BarChart3',
        resource: 'volunteers',
      },
    ],
  },
  {
    label: 'Users',
    icon: 'Users',
    resource: 'users',
    children: [
      { label: 'All Users', href: '/admin/users', icon: 'Users', resource: 'users' },
      { label: 'Roles & Permissions', href: '/admin/roles', icon: 'Shield', resource: 'roles' },
    ],
  },
  {
    label: 'Content',
    icon: 'Newspaper',
    resource: 'content',
    children: [
      { label: 'Overview', href: '/admin/content', icon: 'LayoutDashboard', resource: 'content' },
      { label: 'CMS Hub', href: '/admin/cms', icon: 'Layout', resource: 'content' },
      { label: 'Homepage', href: '/admin/cms/homepage', icon: 'Layout', resource: 'content' },
      { label: 'FAQs', href: '/admin/cms/faqs', icon: 'HelpCircle', resource: 'content' },
      { label: 'Menus', href: '/admin/cms/menus', icon: 'Menu', resource: 'content' },
      { label: 'Testimonials', href: '/admin/cms/testimonials', icon: 'MessageSquare', resource: 'content' },
      { label: 'Review Queue', href: '/admin/cms/review', icon: 'ClipboardList', resource: 'content' },
      { label: 'Calendar', href: '/admin/cms/calendar', icon: 'Calendar', resource: 'content' },
      { label: 'Pages', href: '/admin/content/pages', icon: 'FileText', resource: 'content' },
      { label: 'News', href: '/admin/content/news', icon: 'Newspaper', resource: 'content' },
      { label: 'Announcements', href: '/admin/content/announcements', icon: 'Megaphone', resource: 'content' },
      { label: 'Resources', href: '/admin/content/resources', icon: 'FolderOpen', resource: 'content' },
      { label: 'Categories', href: '/admin/content/categories', icon: 'Tags', resource: 'content' },
      { label: 'Tags', href: '/admin/content/tags', icon: 'Hash', resource: 'content' },
    ],
  },
  {
    label: 'Sermons',
    icon: 'BookOpen',
    resource: 'sermons',
    children: [
      { label: 'All Sermons', href: '/admin/sermons', icon: 'BookOpen', resource: 'sermons' },
      { label: 'Add Sermon', href: '/admin/sermons/create', icon: 'FileText', resource: 'sermons' },
      { label: 'Series', href: '/admin/sermons/series', icon: 'FolderOpen', resource: 'sermons' },
      { label: 'Categories', href: '/admin/sermons/categories', icon: 'Tags', resource: 'sermons' },
      { label: 'Archived', href: '/admin/sermons?status=archived', icon: 'ScrollText', resource: 'sermons' },
    ],
  },
  {
    label: 'Events',
    icon: 'Calendar',
    resource: 'events',
    children: [
      { label: 'All Events', href: '/admin/events', icon: 'Calendar', resource: 'events' },
      { label: 'Add Event', href: '/admin/events/create', icon: 'FileText', resource: 'events' },
      { label: 'Calendar', href: '/admin/events/calendar', icon: 'Calendar', resource: 'events' },
      { label: 'Reports', href: '/admin/events/reports', icon: 'BarChart3', resource: 'events' },
      {
        label: 'Registrations',
        href: '/admin/events/reports',
        icon: 'ClipboardList',
        resource: 'events',
      },
      { label: 'Categories', href: '/admin/events/categories', icon: 'Tags', resource: 'events' },
      { label: 'Locations', href: '/admin/events/locations', icon: 'MapPin', resource: 'events' },
      { label: 'Archived', href: '/admin/events?status=archived', icon: 'ScrollText', resource: 'events' },
    ],
  },
  {
    label: 'Live',
    icon: 'Radio',
    resource: 'events',
    children: [
      { label: 'Overview', href: '/admin/live', icon: 'Radio', resource: 'events' },
      { label: 'Create session', href: '/admin/live/create', icon: 'FileText', resource: 'events' },
      { label: 'Analytics', href: '/admin/live/analytics', icon: 'BarChart3', resource: 'events' },
    ],
  },
  {
    label: 'Prayer',
    icon: 'Heart',
    resource: 'prayer',
    children: [
      { label: 'All Requests', href: '/admin/prayer', icon: 'Heart', resource: 'prayer' },
      { label: 'Categories', href: '/admin/prayer/categories', icon: 'Tags', resource: 'prayer' },
      { label: 'Archived', href: '/admin/prayer?status=archived', icon: 'ScrollText', resource: 'prayer' },
    ],
  },
  { label: 'Media', href: '/admin/media', icon: 'Clapperboard', resource: 'media',
    children: [
      { label: 'Overview', href: '/admin/media', icon: 'Clapperboard', resource: 'media' },
      { label: 'Analytics', href: '/admin/media/analytics', icon: 'BarChart3', resource: 'media' },
      { label: 'Health', href: '/admin/media/health', icon: 'HeartPulse', resource: 'media' },
      { label: 'Playlists', href: '/admin/media/playlists', icon: 'ListMusic', resource: 'media' },
      { label: 'Jobs', href: '/admin/media/jobs', icon: 'Clock', resource: 'media' },
      { label: 'Reports', href: '/admin/media/reports', icon: 'Flag', resource: 'media' },
    ],
  },
  {
    label: 'Gallery',
    icon: 'ImageIcon',
    resource: 'gallery',
    children: [
      { label: 'Albums', href: '/admin/gallery', icon: 'ImageIcon', resource: 'gallery' },
      { label: 'Photos', href: '/admin/gallery/photos', icon: 'ImageIcon', resource: 'gallery' },
      { label: 'Videos', href: '/admin/gallery/videos', icon: 'Clapperboard', resource: 'gallery' },
      { label: 'Categories', href: '/admin/gallery/categories', icon: 'Tags', resource: 'gallery' },
      { label: 'Archived', href: '/admin/gallery?status=archived', icon: 'ScrollText', resource: 'gallery' },
    ],
  },
  {
    label: 'Members',
    icon: 'Users',
    resource: 'members',
    children: [
      { label: 'All Members', href: '/admin/members', icon: 'Users', resource: 'members' },
      { label: 'Applications', href: '/admin/members/applications', icon: 'ClipboardList', resource: 'members' },
      { label: 'Pending Review', href: '/admin/members/applications?pending=1', icon: 'Clock', resource: 'members' },
      { label: 'Active Members', href: '/admin/members?status=active', icon: 'Users', resource: 'members' },
      { label: 'Households', href: '/admin/members/households', icon: 'Home', resource: 'members' },
      {
        label: 'Profile Changes',
        href: '/admin/members/profile-changes',
        icon: 'ClipboardList',
        resource: 'members',
      },
      { label: 'Archived', href: '/admin/members?status=archived', icon: 'ScrollText', resource: 'members' },
    ],
  },
  {
    label: 'Pastoral Care',
    icon: 'HeartHandshake',
    resource: 'pastoral',
    children: [
      { label: 'Dashboard', href: '/admin/pastoral-care', icon: 'LayoutDashboard', resource: 'pastoral' },
      { label: 'My Work', href: '/admin/pastoral-care/my-work', icon: 'ClipboardList', resource: 'pastoral' },
      { label: 'Cases', href: '/admin/pastoral-care/cases', icon: 'FileText', resource: 'pastoral' },
      { label: 'Visits', href: '/admin/pastoral-care/visits', icon: 'Home', resource: 'pastoral' },
      { label: 'Reports', href: '/admin/pastoral-care/reports', icon: 'BarChart3', resource: 'pastoral' },
    ],
  },
  {
    label: 'Attendance',
    icon: 'ClipboardCheck',
    resource: 'attendance',
    children: [
      { label: 'Overview', href: '/admin/attendance', icon: 'ClipboardCheck', resource: 'attendance' },
      { label: 'Sessions', href: '/admin/attendance/sessions', icon: 'Calendar', resource: 'attendance' },
      { label: 'Today', href: '/admin/attendance?view=today', icon: 'Clock', resource: 'attendance' },
      { label: 'Check-in', href: '/admin/attendance/check-in', icon: 'ClipboardCheck', resource: 'attendance' },
      { label: 'Reports', href: '/admin/attendance/reports', icon: 'BarChart3', resource: 'attendance' },
    ],
  },
  {
    label: 'Giving',
    icon: 'HandHeart',
    resource: 'giving',
    children: [
      { label: 'Overview', href: '/admin/giving', icon: 'HandHeart', resource: 'giving' },
      { label: 'Contributions', href: '/admin/giving/contributions', icon: 'HandHeart', resource: 'giving' },
      { label: 'Campaigns', href: '/admin/giving/campaigns', icon: 'Megaphone', resource: 'giving' },
      { label: 'Record offline', href: '/admin/giving/record', icon: 'HandHeart', resource: 'giving' },
    ],
  },
  {
    label: 'Finance',
    icon: 'Wallet',
    resource: 'finance',
    children: [
      { label: 'Overview', href: '/admin/finance', icon: 'Wallet', resource: 'finance' },
      { label: 'Funds', href: '/admin/finance/funds', icon: 'HandHeart', resource: 'finance' },
      {
        label: 'Payment providers',
        href: '/admin/finance/payment-providers',
        icon: 'Wallet',
        resource: 'finance',
      },
      { label: 'QR links', href: '/admin/finance/qr-links', icon: 'Megaphone', resource: 'finance' },
      {
        label: 'Donations',
        href: '/admin/finance/donations',
        icon: 'HandHeart',
        resource: 'finance',
      },
      { label: 'Expenses', href: '/admin/finance/expenses', icon: 'FileText', resource: 'finance' },
      { label: 'Budgets', href: '/admin/finance/budgets', icon: 'BarChart3', resource: 'finance' },
      {
        label: 'Reconciliation',
        href: '/admin/finance/reconciliation',
        icon: 'ClipboardList',
        resource: 'finance',
      },
      { label: 'Reports', href: '/admin/finance/reports', icon: 'BarChart3', resource: 'finance' },
      { label: 'Ledger', href: '/admin/finance/ledger', icon: 'ScrollText', resource: 'finance' },
    ],
  },
  {
    label: 'Communications',
    icon: 'Bell',
    resource: 'communications',
    children: [
      { label: 'Overview', href: '/admin/communications', icon: 'Bell', resource: 'communications' },
      { label: 'Send', href: '/admin/communications/send', icon: 'Send', resource: 'communications' },
      {
        label: 'Templates',
        href: '/admin/communications/templates',
        icon: 'FileText',
        resource: 'communications',
      },
      {
        label: 'Reports',
        href: '/admin/communications/reports',
        icon: 'BarChart3',
        resource: 'communications',
      },
      {
        label: 'Emergency',
        href: '/admin/communications/emergency',
        icon: 'AlertTriangle',
        resource: 'communications',
      },
      { label: 'Messages', href: '/admin/messages', icon: 'MessageSquare', resource: 'communications' },
      {
        label: 'Announcements',
        href: '/admin/communications/announcements',
        icon: 'Megaphone',
        resource: 'communications',
      },
      {
        label: 'Delivery logs',
        href: '/admin/communications/delivery',
        icon: 'ScrollText',
        resource: 'communications',
      },
      {
        label: 'Settings',
        href: '/admin/communications/settings',
        icon: 'Settings',
        resource: 'communications',
      },
    ],
  },
  { label: 'Audit Logs', href: '/admin/audit', icon: 'ScrollText', resource: 'security_logs' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings', resource: 'settings' },
];

export interface NavPermissionUser {
  role: { slug: string };
  permissions: Array<{ resource: string; action: string }>;
}

export function itemIsAllowed(
  item: AdminNavItem,
  canView: (resource: string) => boolean
): boolean {
  if (!item.resource) return true;
  return canView(item.resource);
}

export function filterAdminNavigation(
  items: AdminNavItem[],
  canView: (resource: string) => boolean
): AdminNavItem[] {
  return items
    .map((item) => {
      if (!itemIsAllowed(item, canView)) return null;
      if (item.children) {
        const children = item.children.filter((child) => itemIsAllowed(child, canView));
        if (children.length === 0 && !item.href) return null;
        return { ...item, children };
      }
      return item;
    })
    .filter((item): item is AdminNavItem => Boolean(item));
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const BREADCRUMB_LABELS: Record<string, string> = {
  admin: 'Dashboard',
  church: 'Church',
  services: 'Service Times',
  locations: 'Locations',
  'social-links': 'Social Links',
  leadership: 'Leadership',
  governance: 'Governance',
  history: 'History',
  create: 'Create',
  positions: 'Positions',
  ministries: 'Ministries',
  request: 'Request',
  categories: 'Categories',
  users: 'Users',
  roles: 'Roles & Permissions',
  permissions: 'Permissions',
  settings: 'Settings',
  profile: 'My Profile',
  audit: 'Audit Logs',
  help: 'Help',
  sermons: 'Sermons',
  series: 'Series',
  archive: 'Archived',
  events: 'Events',
  live: 'Live',
  analytics: 'Analytics',
  registrations: 'Registrations',
  calendar: 'Calendar',
  prayer: 'Prayer',
  media: 'Media',
  gallery: 'Gallery',
  members: 'Members',
  applications: 'Applications',
  households: 'Households',
  'profile-changes': 'Profile Changes',
  pastoral: 'Pastoral Care',
  'pastoral-care': 'Pastoral Care',
  'my-work': 'My Work',
  cases: 'Cases',
  visits: 'Visits',
  care: 'Pastoral care',
  attendance: 'Attendance',
  sessions: 'Sessions',
  reports: 'Reports',
  'check-in': 'Check-in',
  giving: 'Giving',
  communications: 'Communications',
  delivery: 'Delivery logs',
  send: 'Send',
  contributions: 'Contributions',
  campaigns: 'Campaigns',
  record: 'Record offline',
  notifications: 'Notifications',
  announcements: 'Announcements',
  resources: 'Resources',
  content: 'Content',
  cms: 'CMS',
  homepage: 'Homepage',
  faqs: 'FAQs',
  menus: 'Menus',
  testimonials: 'Testimonials',
  review: 'Review Queue',
  news: 'News',
  pages: 'Pages',
  tags: 'Tags',
  preview: 'Preview',
  finance: 'Finance',
  expenses: 'Expenses',
  budgets: 'Budgets',
  reconciliation: 'Reconciliation',
  ledger: 'Ledger',
  staff: 'Staff',
  directory: 'Directory',
  volunteers: 'Volunteers',
  schedule: 'Schedule',
  ministry: 'Ministry',
  teams: 'Teams',
  assignments: 'Assignments',
  rosters: 'Rosters',
  training: 'Training',
  volunteering: 'Volunteering',
  availability: 'Availability',
  apply: 'Apply',
};

export function breadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [];
  let href = '';

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    href += `/${part}`;
    const isLast = index === parts.length - 1;
    const looksLikeId = /^[0-9a-f-]{8,}$/i.test(part);
    const label = looksLikeId
      ? part
      : BREADCRUMB_LABELS[part] || part.replace(/-/g, ' ');

    crumbs.push({
      label: index === 0 ? 'Dashboard' : label,
      href: isLast ? undefined : href === '/admin' ? '/admin' : href,
    });
  }

  if (crumbs.length === 0) {
    crumbs.push({ label: 'Dashboard' });
  }
  return crumbs;
}

export interface QuickAction {
  label: string;
  href: string;
  permission: string;
}

export const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { label: 'Add User', href: '/admin/users?create=1', permission: 'users.create' },
  { label: 'Add Ministry', href: '/admin/ministries/create', permission: 'ministries.create' },
  { label: 'Add Leader', href: '/admin/leadership/create', permission: 'leadership.create' },
  { label: 'Add News Article', href: '/admin/content/news/create', permission: 'content.create' },
  { label: 'Add Sermon', href: '/admin/sermons/create', permission: 'sermons.create' },
  { label: 'Add Event', href: '/admin/events/create', permission: 'events.create' },
  { label: 'Review Prayer Requests', href: '/admin/prayer', permission: 'prayer.view' },
  { label: 'Open Attendance', href: '/admin/attendance', permission: 'attendance.view' },
  { label: 'Record Offering', href: '/admin/giving/record', permission: 'giving.create' },
  { label: 'Edit Church Information', href: '/admin/church', permission: 'church.update' },
];

export function filterQuickActions(
  actions: QuickAction[],
  canDo: (key: string) => boolean
): QuickAction[] {
  return actions.filter((action) => canDo(action.permission));
}
