import Link from 'next/link';
import { Calendar, BookOpen, Heart, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const quickLinks = [
  {
    title: 'Upcoming Events',
    description: 'View and RSVP to upcoming church events and activities.',
    icon: Calendar,
    href: '/member/events',
  },
  {
    title: 'Recent Sermons',
    description: 'Browse the latest sermons and teachings from our church.',
    icon: BookOpen,
    href: '/member/sermons',
  },
  {
    title: 'Prayer Requests',
    description: 'Submit and view community prayer requests.',
    icon: Heart,
    href: '/member/prayer',
  },
];

export default function MemberDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            My Dashboard
          </CardTitle>
          <CardDescription>
            Welcome back! Here is your church activity overview.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Link Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="transition-colors group-hover:bg-primary/5 group-hover:border-primary/20">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {link.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Go to {link.title}
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
