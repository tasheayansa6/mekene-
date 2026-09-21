'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Certificate = {
  id: string;
  courseTitle: string;
  programName: string | null;
  studentName: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
};

export default function MemberCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ certificates: Certificate[] }>('/member/education/certificates').then(
      (result) => {
        if (!result.success) {
          setError(result.message);
          setCerts([]);
          return;
        }
        setCerts(result.data?.certificates || []);
      }
    );
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Issued education certificates and public verification links.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!certs ? <Skeleton className="h-24 w-full" /> : null}
      {certs && certs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No certificates yet.</p>
      ) : null}
      <ul className="space-y-4">
        {(certs || []).map((c) => (
          <li key={c.id} className="border-b pb-4">
            <p className="font-medium">{c.courseTitle}</p>
            {c.programName ? (
              <p className="text-sm text-muted-foreground">{c.programName}</p>
            ) : null}
            <p className="mt-1 font-mono text-xs">{c.certificateNumber}</p>
            <p className="text-xs text-muted-foreground">
              Issued {new Date(c.issuedAt).toLocaleDateString()}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href={`/verify/certificate/${c.verificationCode}`}>Verify</Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
