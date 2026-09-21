import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, HelpCircle, Landmark, Megaphone } from 'lucide-react';

import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { churchConfig } from '@/config/church';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Give | Busa Mekene Eyasus Church',
  description:
    'Support Busa Mekene Eyasus Church through tithes, offerings, and campaign gifts. Card numbers are never collected on this site.',
};

type BankInfo = {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  note?: string;
};

function getBankInfo(): BankInfo | null {
  const config = churchConfig as typeof churchConfig & {
    bank?: BankInfo;
    bankTransfer?: BankInfo;
  };
  const bank = config.bank || config.bankTransfer;
  if (!bank) return null;
  if (!bank.bankName && !bank.accountNumber && !bank.accountName) return null;
  return bank;
}

const quickLinks = [
  {
    title: 'Tithe',
    description: 'Return a tenth in faith and gratitude.',
    href: '/give/now?fund=tithe',
  },
  {
    title: 'Offering',
    description: 'A freewill gift for the work of the church.',
    href: '/give/now?fund=offering',
  },
  {
    title: 'Campaigns',
    description: 'Support active fundraising goals.',
    href: '/give/campaigns',
  },
];

const faqItems = [
  {
    q: 'Do you store card numbers?',
    a: 'No. This site never collects card numbers, CVV, PINs, or banking passwords. Confirmed online gifts are verified by the payment provider.',
  },
  {
    q: 'How do I know my gift went through?',
    a: 'After checkout you will see a confirmation or a pending status page. A receipt is available once the gift is confirmed.',
  },
  {
    q: 'Can I give by bank transfer?',
    a: 'Yes. Choose bank transfer on the give form, or use the church account details below when published. Finance staff reconcile transfers.',
  },
];

export default function GiveHubPage() {
  const bank = getBankInfo();

  return (
    <div className="page-transition">
      <PageHero
        title="Give"
        subtitle="Support our mission"
        description="Your generosity sustains worship, pastoral care, and community outreach at Busa Mekene Eyasus Church."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give' },
        ]}
      />

      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-balance text-lg leading-relaxed text-muted-foreground">
            Give securely online, or transfer through your bank. We never ask for card
            details on this website.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/give/now">Give now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/give/campaigns">View campaigns</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section variant="warm">
        <SectionHeading
          title="Ways to give"
          description="Start with a common fund, or open a campaign."
          icon={Heart}
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <div key={item.title} className="space-y-3 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-primary">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={item.href}>Continue</Link>
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {bank ? (
        <Section>
          <SectionHeading
            title="Bank transfer"
            description="Use these details when giving by transfer. Include your name as the reference when possible."
            icon={Landmark}
          />
          <div className="mx-auto mt-8 max-w-xl space-y-2 text-sm">
            {bank.bankName ? (
              <p>
                <span className="font-medium">Bank:</span> {bank.bankName}
              </p>
            ) : null}
            {bank.accountName ? (
              <p>
                <span className="font-medium">Account name:</span> {bank.accountName}
              </p>
            ) : null}
            {bank.accountNumber ? (
              <p>
                <span className="font-medium">Account number:</span> {bank.accountNumber}
              </p>
            ) : null}
            {bank.note ? <p className="text-muted-foreground">{bank.note}</p> : null}
          </div>
        </Section>
      ) : null}

      <Section variant="muted">
        <SectionHeading
          title="Giving FAQ"
          description="Simple answers about how online giving works here."
          icon={HelpCircle}
        />
        <div className="mx-auto mt-10 max-w-2xl space-y-6">
          {faqItems.map((item) => (
            <div key={item.q} className="space-y-2">
              <h3 className="font-medium text-primary">{item.q}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Megaphone className="size-8 text-primary" aria-hidden />
          <h2 className="text-2xl font-semibold text-primary">Ready to give?</h2>
          <p className="text-muted-foreground">
            Open the secure form to choose an amount and fund. Contact{' '}
            <a className="underline" href={`mailto:${churchConfig.contact.email}`}>
              {churchConfig.contact.email}
            </a>{' '}
            if you need help.
          </p>
          <Button asChild size="lg">
            <Link href="/give/now">Give now</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
