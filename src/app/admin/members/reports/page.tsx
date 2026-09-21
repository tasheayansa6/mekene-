'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MemberReportsPage() {
  const [cards, setCards] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    void apiGet<{ cards: Record<string, number> }>('/admin/members/reports').then((r) => {
      setCards(r.data?.cards || null);
    });
  }, []);

  return (
    <PermissionGate permission="members.view">
      <div className="space-y-6">
        <PageHeader
          title="Membership reports"
          description="Aggregate counts only. No individual giving or pastoral details."
          actions={
            <Button asChild variant="outline">
              <a href="/api/v1/admin/members/export">Export CSV</a>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards
            ? Object.entries(cards).map(([key, value]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{value}</CardContent>
                </Card>
              ))
            : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/members">Members</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/members/applications">Applications</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/members/import">Import</Link>
          </Button>
        </div>
      </div>
    </PermissionGate>
  );
}
