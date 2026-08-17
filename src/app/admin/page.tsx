import Link from 'next/link';
import { Users, BookOpen, Calendar, Heart, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const stats = [
  {
    label: 'Total Members',
    value: '--',
    icon: Users,
    href: '/admin/members',
  },
  {
    label: 'Sermons',
    value: '--',
    icon: BookOpen,
    href: '/admin/sermons',
  },
  {
    label: 'Events',
    value: '--',
    icon: Calendar,
    href: '/admin/events',
  },
  {
    label: 'Prayer Requests',
    value: '--',
    icon: Heart,
    href: '/admin/prayer',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div>
        <h2 className="text-2xl font-bold text-primary">Admin Dashboard</h2>
        <p className="mt-2 text-muted-foreground">
          Welcome to the administration panel. Select a section from the sidebar
          to manage church content.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">
                  {stat.label}
                </CardDescription>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
                <Link
                  href={stat.href}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View all
                  <ArrowRight className="size-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
