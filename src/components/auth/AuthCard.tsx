'use client';

import Link from 'next/link';
import { Church } from 'lucide-react';
import { churchConfig } from '@/config/church';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link href="/" className="mb-3 flex items-center gap-2 text-primary">
          <Church className="size-7" />
          <span className="font-semibold">{churchConfig.branding.name}</span>
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {churchConfig.branding.tagline}
        </p>
      </div>
      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
