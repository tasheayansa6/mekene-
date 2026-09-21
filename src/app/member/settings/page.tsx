'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const items = [
  { href: '/member/profile', title: 'Profile & privacy', description: 'Name, photo, language, and directory visibility.' },
  { href: '/member/settings/notifications', title: 'Notifications', description: 'Email, in-app, Telegram, and SMS preferences.' },
  { href: '/member/settings/security', title: 'Security', description: 'Password, sessions, and sign-out on other devices.' },
  { href: '/profile', title: 'Account names', description: 'First name, last name, phone, and email.' },
];

export default function MemberSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user?.email}. Language preference is saved on your membership profile.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full hover:bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <Button asChild variant="outline">
        <a href="/api/v1/member/export">Download my data</a>
      </Button>
    </div>
  );
}
