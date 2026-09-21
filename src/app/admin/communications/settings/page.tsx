'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminCommunicationsSettingsPage() {
  return (
    <PermissionGate permission="communications.manage">
      <div className="space-y-6">
        <PageHeader
          title="Communication integrations"
          description="Telegram and social providers use official APIs and server-side credentials only."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Back</Link>
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Telegram</CardTitle>
            <CardDescription>
              Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in server environment variables.
              Announcements publish only when “Publish to Telegram” is explicitly selected.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Bot tokens never appear in frontend code. Official Telegram Bot API only.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Social (prepared)</CardTitle>
            <CardDescription>
              Facebook / TikTok adapters are scaffolded for future official API integrations. Unofficial
              scraping and automation are not supported.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </PermissionGate>
  );
}
