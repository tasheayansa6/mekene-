import {
  Music,
  GraduationCap,
  Heart,
  BookOpen,
  HandHelping,
  HandHeart,
  Megaphone,
  Cross,
  type LucideIcon,
} from 'lucide-react';

export interface MinistryData {
  slug: string;
  name: string;
  description: string;
  leaderName: string;
  memberCount: number;
  icon: LucideIcon;
  href: string;
  fullDescription?: string;
  activities?: string[];
  schedule?: string;
}

export const ministriesData: MinistryData[] = [
  {
    slug: 'choir-music',
    name: 'Choir & Music Ministry',
    description:
      'Leading the congregation in worship through sacred Ethiopian hymns (Zema) and spiritual songs.',
    fullDescription:
      'Our Choir & Music Ministry is dedicated to preserving and sharing the rich musical heritage of the Ethiopian Orthodox Tewahedo Church. Through the sacred art of Zema (traditional Ethiopian liturgical chant) and contemporary spiritual songs, we lead the congregation into heartfelt worship. Our choir members undergo rigorous training in the ancient musical traditions that have been passed down through generations.',
    leaderName: 'Brother Tadesse Girma',
    memberCount: 24,
    icon: Music,
    href: '/ministries/choir-music',
    activities: [
      'Sunday Divine Liturgy worship leading',
      'Weekly choir rehearsal and Zema training',
      'Special feast day musical programs',
      'Youth music mentorship and development',
      'Recording and preserving traditional hymns',
    ],
    schedule: 'Rehearsals: Thursdays 6:00 PM \u2013 8:00 PM, Sundays 6:00 AM (before Liturgy)',
  },
  {
    slug: 'youth',
    name: 'Youth Ministry',
    description:
      'Empowering young people to grow in faith, leadership, and service through fellowship and Bible study.',
    fullDescription:
      'The Youth Ministry of Busa Mekenene Eyasus Church is a vibrant community of young believers committed to growing in their Orthodox Christian faith. We provide a nurturing environment where youth can develop their spiritual lives, build meaningful friendships, and discover their God-given purpose through service to the church and community.',
    leaderName: 'Brother Yohannes Alemu',
    memberCount: 45,
    icon: GraduationCap,
    href: '/ministries/youth',
    activities: [
      'Weekly Bible study and faith discussions',
      'Youth fellowship and social events',
      'Leadership development programs',
      'Community service projects',
      'Annual youth retreat and conference',
    ],
    schedule: 'Meetings: Saturdays 3:00 PM \u2013 5:00 PM, Special events as announced',
  },
  {
    slug: 'womens-fellowship',
    name: "Women's Fellowship",
    description:
      'A supportive community for women to connect, pray, serve, and grow together in faith.',
    fullDescription:
      "Our Women's Fellowship is a cornerstone of the church community, providing a warm and supportive space for women of all ages to deepen their faith, build lasting friendships, and serve together. Rooted in the traditions of the Ethiopian Orthodox Church, we draw inspiration from the holy women of Scripture and the many saints who have gone before us.",
    leaderName: 'Sister Martha Kebede',
    memberCount: 38,
    icon: Heart,
    href: '/ministries/womens-fellowship',
    activities: [
      'Monthly prayer meetings and fellowship gatherings',
      'Bible study and spiritual book discussions',
      'Supporting families in need within the congregation',
      'Organizing church celebrations and hospitality',
      'Mentorship programs for younger women',
    ],
    schedule: 'Fellowship: 1st and 3rd Saturdays of the month, 10:00 AM \u2013 12:00 PM',
  },
  {
    slug: 'sunday-school',
    name: 'Sunday School',
    description:
      'Religious education for children and youth, teaching the faith and traditions of the Ethiopian Orthodox Church.',
    fullDescription:
      'Our Sunday School ministry is committed to nurturing the faith of the next generation. Through age-appropriate lessons, interactive activities, and engaging storytelling, we teach children and youth the foundational truths of the Ethiopian Orthodox Tewahedo faith \u2014 from the Holy Scriptures to the lives of the saints, the meaning of the sacraments, and the beauty of our liturgical traditions.',
    leaderName: 'Sister Ruth Haile',
    memberCount: 32,
    icon: BookOpen,
    href: '/ministries/sunday-school',
    activities: [
      'Weekly Sunday School classes for all age groups',
      'Bible storytelling and memorization',
      'Teaching Ethiopian Orthodox hymns and prayers',
      'Holiday and feast day special programs',
      'Annual Sunday School celebration and competition',
    ],
    schedule: 'Classes: Saturdays 8:00 AM \u2013 10:00 AM',
  },
  {
    slug: 'prayer',
    name: 'Prayer Ministry',
    description:
      'Dedicated to intercessory prayer, supporting the spiritual needs of the congregation and community.',
    fullDescription:
      'The Prayer Ministry stands as a spiritual pillar of our church, devoted to lifting up the needs of our congregation, community, and the world in prayer. Inspired by the monastic prayer traditions of the Ethiopian Orthodox Church, our members commit to regular intercession, fasting prayers, and spiritual warfare, trusting in the power of persistent prayer.',
    leaderName: 'Deacon Daniel Tadesse',
    memberCount: 18,
    icon: HandHelping,
    href: '/ministries/prayer',
    activities: [
      'Weekly intercessory prayer meetings',
      'Fasting prayer sessions during Lenten seasons',
      'Prayer chain for urgent community needs',
      'Personal prayer counseling and support',
      'Organizing all-night prayer vigils',
    ],
    schedule: 'Prayer meetings: Wednesdays 5:00 PM \u2013 6:00 PM (before Midweek service)',
  },
  {
    slug: 'community-outreach',
    name: 'Community Outreach',
    description:
      'Serving the local community through charitable works, food distribution, and fellowship.',
    fullDescription:
      'Our Community Outreach Ministry embodies the call of Christ to serve our neighbors. We work to address the physical and spiritual needs of those around us through organized charitable works, food distribution programs, and acts of fellowship. This ministry is the hands and feet of our church, extending God\'s love beyond our walls into the community.',
    leaderName: 'Brother Alemayehu Bekele',
    memberCount: 28,
    icon: HandHeart,
    href: '/ministries/community-outreach',
    activities: [
      'Monthly food distribution to families in need',
      'Community health awareness programs',
      'Supporting local orphanages and shelters',
      'Emergency relief assistance',
      'Community cleanup and beautification projects',
    ],
    schedule: 'Planning meetings: 2nd Sunday of each month after Liturgy, Outreach events as scheduled',
  },
  {
    slug: 'evangelism',
    name: 'Evangelism',
    description:
      'Sharing the Gospel message and welcoming new members into the church community.',
    fullDescription:
      'The Evangelism Ministry is passionate about sharing the life-transforming message of the Gospel of Jesus Christ. We reach out to those who have not yet come to know the Lord, welcome newcomers into our church family, and provide spiritual guidance for those seeking to learn more about the Ethiopian Orthodox Tewahedo faith.',
    leaderName: 'Deacon Yohannes Tekle',
    memberCount: 15,
    icon: Megaphone,
    href: '/ministries/evangelism',
    activities: [
      'Door-to-door community outreach visits',
      'New member welcome and orientation programs',
      'Faith education classes for inquirers',
      'Distributing religious literature and resources',
      'Follow-up and discipleship for new believers',
    ],
    schedule: 'Outreach: Saturdays 2:00 PM \u2013 4:00 PM, Training: 1st Friday of the month 6:00 PM',
  },
  {
    slug: 'diaconate',
    name: 'Diaconate Service',
    description:
      'Assisting in the Divine Liturgy and serving the church through dedicated diaconal ministry.',
    fullDescription:
      'The Diaconate Service Ministry is composed of dedicated deacons who serve at the altar during the Divine Liturgy and other sacred services. Following the ancient traditions of the Ethiopian Orthodox Church, our deacons assist the priests in administering the sacraments, maintaining the sanctity of the worship space, and ensuring the orderly conduct of liturgical services.',
    leaderName: 'Deacon Daniel Tadesse',
    memberCount: 20,
    icon: Cross,
    href: '/ministries/diaconate',
    activities: [
      'Assisting in the Divine Liturgy and sacraments',
      'Maintaining the church and altar preparation',
      'Liturgical chant and readings during services',
      'Deacon training and spiritual formation',
      'Serving at weddings, funerals, and other sacraments',
    ],
    schedule: 'Service: Every Sunday and feast day Liturgy, Training: Tuesdays 6:00 PM \u2013 7:30 PM',
  },
];

export function getMinistryBySlug(slug: string): MinistryData | undefined {
  return ministriesData.find((m) => m.slug === slug);
}
