export interface NewsData {
  slug: string;
  title: string;
  content: string;
  date: string;
  author?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  imageUrl?: string;
}

export const newsData: NewsData[] = [
  {
    slug: 'annual-conference-2025',
    title: 'Annual Church Conference Scheduled for September',
    content:
      "We are excited to announce our annual church conference coming this September 12-14. Join us for three days of worship, teaching, and fellowship. This year's theme is \"Growing Together in Faith and Love.\" Register at the church office or contact us for more information.",
    date: '2025-08-12',
    author: 'Church Office',
    priority: 'high',
    category: 'Announcement',
  },
  {
    slug: 'new-sunday-school-curriculum',
    title: 'New Sunday School Curriculum Launch',
    content:
      'Our Sunday School program has been updated with new materials for all age groups. The new curriculum focuses on the foundations of the Evangelical faith, including the lives of faithful believers, the ordinances, and the Holy Scriptures.',
    date: '2025-08-08',
    author: 'Education Team',
    priority: 'medium',
    category: 'Education',
  },
  {
    slug: 'youth-retreat-success',
    title: 'Youth Retreat: A Time of Renewal',
    content:
      'Over 40 young people attended our annual youth retreat last month. The weekend was filled with worship, Bible study, outdoor activities, and meaningful fellowship. Many testified to experiencing spiritual renewal.',
    date: '2025-08-01',
    author: 'Youth Ministry',
    priority: 'medium',
    category: 'Youth',
  },
  {
    slug: 'church-building-update',
    title: 'Church Building Renovation Update',
    content:
      'We are grateful to share that the renovation of our church building is progressing well. The new roof has been completed, and work on the interior is underway. We thank all who have contributed to this project.',
    date: '2025-07-25',
    author: 'Building Committee',
    priority: 'low',
    category: 'Building',
  },
  {
    slug: 'community-food-distribution',
    title: 'Monthly Food Distribution Program',
    content:
      'Our community outreach ministry distributed food packages to over 100 families this month. We continue to serve our community and welcome volunteers to join this important ministry.',
    date: '2025-07-20',
    author: 'Outreach Ministry',
    priority: 'low',
    category: 'Community',
  },
];

export function getNewsBySlug(slug: string): NewsData | undefined {
  return newsData.find((n) => n.slug === slug);
}
