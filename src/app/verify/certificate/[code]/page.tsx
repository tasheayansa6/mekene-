import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { verifyCertificateByCode } from '@/lib/education/certificates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  return {
    title: 'Certificate verification',
    description: 'Verify a church education certificate.',
    robots: { index: false, follow: false },
  };
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cert = await verifyCertificateByCode(code);

  return (
    <div className="page-transition">
      <PageHero
        title="Certificate verification"
        subtitle="Church education"
        description="Confirm whether a certificate verification code is valid."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Verify certificate' },
        ]}
      />
      <Section>
        {!cert ? (
          <div>
            <p className="text-sm text-destructive">Certificate not found for this code.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/education">Back to education</Link>
            </Button>
          </div>
        ) : (
          <dl className="max-w-lg space-y-3 text-sm">
            <div>
              <dt className="font-medium">Status</dt>
              <dd className={cert.valid ? 'text-green-700' : 'text-destructive'}>
                {cert.valid ? 'Valid' : cert.status}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Student</dt>
              <dd className="text-muted-foreground">{cert.studentName}</dd>
            </div>
            <div>
              <dt className="font-medium">Course</dt>
              <dd className="text-muted-foreground">{cert.courseTitle}</dd>
            </div>
            {cert.programName ? (
              <div>
                <dt className="font-medium">Program</dt>
                <dd className="text-muted-foreground">{cert.programName}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium">Certificate number</dt>
              <dd className="font-mono text-muted-foreground">{cert.certificateNumber}</dd>
            </div>
            <div>
              <dt className="font-medium">Issued</dt>
              <dd className="text-muted-foreground">
                {new Date(cert.issuedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        )}
      </Section>
    </div>
  );
}
