import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { MembershipApplyForm } from '@/components/forms/MembershipApplyForm';

export const metadata: Metadata = {
  title: 'Apply for Membership',
  description:
    'Submit a membership application to Busa Mekene Eyasus Church. A website account is not the same as church membership.',
  robots: { index: false, follow: false },
};

export default function MembershipApplyPage() {
  return (
    <div className="page-transition">
      <PageHero
        title="Apply for church membership"
        subtitle="Membership"
        description="A website account is not church membership. Applications are reviewed by authorized church staff. Approval is never automatic."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Membership' },
          { label: 'Apply' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-2xl">
          <Card className="border-t-4 border-t-primary">
            <CardContent className="p-6 sm:p-8">
              <MembershipApplyForm />
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
