'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { Section } from '@/components/layout/Section';
import { PageHero } from '@/components/sections/PageHero';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface FundOption {
  slug: string;
  name: string;
  minAmount: string;
  maxAmount?: string | null;
  presetAmounts?: string[];
}

interface Options {
  categories: FundOption[];
  funds?: FundOption[];
  campaigns: Array<{ slug: string; title: string }>;
  ministries?: Array<{ slug: string; name: string }>;
  currency?: string;
  supportedCurrencies?: string[];
  presets?: string[];
  provider: {
    displayName: string;
    onlineCheckoutAvailable: boolean;
    recurringAvailable?: boolean;
  };
  terms?: {
    donationTerms?: string | null;
    refundPolicyNote?: string | null;
    privacyNote?: string | null;
  };
}

export function GiveForm({
  initialCategory,
  initialCampaign,
  initialMinistry,
  initialEvent,
  initialAmount,
  initialCurrency,
}: {
  initialCategory?: string;
  initialCampaign?: string;
  initialMinistry?: string;
  initialEvent?: string;
  initialAmount?: string;
  initialCurrency?: string;
}) {
  const router = useRouter();
  const amountId = useId();
  const [options, setOptions] = useState<Options | null>(null);
  const [amount, setAmount] = useState(initialAmount || '');
  const [currency, setCurrency] = useState(
    (initialCurrency || 'ETB').toUpperCase()
  );
  const [categorySlug, setCategorySlug] = useState(initialCategory || '');
  const [campaignSlug, setCampaignSlug] = useState(initialCampaign || 'none');
  const [ministrySlug, setMinistrySlug] = useState(initialMinistry || 'none');
  const [eventSlug] = useState(initialEvent || '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [note, setNote] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'bank_transfer'>(
    'online'
  );
  const [pending, setPending] = useState(false);
  const [useCustomAmount, setUseCustomAmount] = useState(
    Boolean(initialAmount && !(options?.presets || []).includes(initialAmount))
  );

  const funds = useMemo(
    () => options?.funds || options?.categories || [],
    [options]
  );

  const selectedFund = useMemo(
    () => funds.find((f) => f.slug === categorySlug) || null,
    [funds, categorySlug]
  );

  const presets = useMemo(() => {
    if (selectedFund?.presetAmounts?.length) return selectedFund.presetAmounts;
    return options?.presets || ['100', '250', '500', '1000'];
  }, [selectedFund, options]);

  const currencies = useMemo(() => {
    const list = options?.supportedCurrencies?.length
      ? options.supportedCurrencies
      : ['ETB'];
    return list.map((c) => c.toUpperCase());
  }, [options]);

  useEffect(() => {
    void apiGet<Options>('/giving/options').then((result) => {
      if (!result.data) return;
      setOptions(result.data);
      const fundList = result.data.funds || result.data.categories || [];
      if (!initialCategory && fundList[0]) {
        setCategorySlug(fundList[0].slug);
      } else if (initialCategory) {
        setCategorySlug(initialCategory);
      }
      if (!initialCurrency && result.data.currency) {
        setCurrency(result.data.currency.toUpperCase());
      }
      const availablePresets =
        fundList.find((f) => f.slug === (initialCategory || fundList[0]?.slug))
          ?.presetAmounts ||
        result.data.presets ||
        [];
      if (initialAmount && !availablePresets.includes(initialAmount)) {
        setUseCustomAmount(true);
      }
    });
  }, [initialCategory, initialCurrency, initialAmount]);

  function selectPreset(value: string) {
    setUseCustomAmount(false);
    setAmount(value);
  }

  async function submit() {
    if (!categorySlug.trim() || !amount.trim()) {
      toast.error('Please choose a fund and amount.');
      return;
    }
    setPending(true);
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `give-${Date.now()}`;
    const result = await apiPost<{
      contribution: { reference: string };
      checkout: { message: string; redirectUrl: string | null };
    }>('/giving/contributions', {
      amount,
      currency,
      categorySlug,
      campaignSlug: campaignSlug === 'none' ? null : campaignSlug,
      ministrySlug: ministrySlug === 'none' ? null : ministrySlug,
      eventSlug: eventSlug || null,
      isAnonymous,
      note: note || null,
      guestName: guestName || null,
      guestEmail: guestEmail || null,
      paymentMethod,
      idempotencyKey,
    });
    setPending(false);
    if (!result.success || !result.data?.contribution) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.data.checkout?.message || result.message || 'Contribution submitted.');
    const ref = result.data.contribution.reference;
    if (result.data.checkout?.redirectUrl) {
      window.location.href = result.data.checkout.redirectUrl;
      return;
    }
    if (paymentMethod === 'online' || paymentMethod === 'bank_transfer') {
      router.push(`/give/pending?ref=${encodeURIComponent(ref)}`);
      return;
    }
    router.push(`/give/receipt/${ref}`);
  }

  return (
    <div className="page-transition">
      <PageHero
        title="Give now"
        subtitle="Offerings & donations"
        description="Support the ministry of Busa Mekene Eyasus Church. Card numbers and banking passwords are never collected on this site."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Give', href: '/give' },
          { label: 'Give now' },
        ]}
      />
      <Section>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_18rem]">
          <Card>
            <CardHeader>
              <CardTitle>Contribution</CardTitle>
              <CardDescription>
                Choose an amount and fund. Online checkout uses a configured payment
                provider when available; otherwise finance staff can reconcile bank
                transfers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={
                        !useCustomAmount && amount === preset ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => selectPreset(preset)}
                    >
                      {currency} {preset}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={useCustomAmount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setUseCustomAmount(true);
                      if (presets.includes(amount)) setAmount('');
                    }}
                  >
                    Custom
                  </Button>
                </div>
                {useCustomAmount ? (
                  <div className="space-y-2 pt-1">
                    <Label htmlFor={amountId}>Custom amount ({currency})</Label>
                    <Input
                      id={amountId}
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100.00"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(value) => setCurrency(value.toUpperCase())}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fund / contribution type</Label>
                <Select value={categorySlug} onValueChange={setCategorySlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a fund" />
                  </SelectTrigger>
                  <SelectContent>
                    {funds.map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Campaign (optional)</Label>
                <Select value={campaignSlug} onValueChange={setCampaignSlug}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No campaign</SelectItem>
                    {(options?.campaigns || []).map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {options?.ministries && options.ministries.length > 0 ? (
                <div className="space-y-2">
                  <Label>Ministry (optional)</Label>
                  <Select value={ministrySlug} onValueChange={setMinistrySlug}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No ministry</SelectItem>
                      {options.ministries.map((item) => (
                        <SelectItem key={item.slug} value={item.slug}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {eventSlug ? (
                <p className="text-xs text-muted-foreground">
                  Linked to event: <span className="font-medium">{eventSlug}</span>
                </p>
              ) : null}

              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setPaymentMethod(value as 'online' | 'bank_transfer')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online payment</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {options?.provider.recurringAvailable ? (
                <p className="text-sm text-muted-foreground">
                  Prefer a recurring gift? You can manage schedules in{' '}
                  <Link
                    href="/member/giving/schedules"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    My giving schedules
                  </Link>
                  .
                </p>
              ) : null}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                />
                <Label htmlFor="anonymous">Give anonymously in public displays</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Optional note</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guest-name">Name (if not signed in)</Label>
                  <Input
                    id="guest-name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-email">Email (if not signed in)</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </div>
              </div>

              {options?.terms?.donationTerms ? (
                <p className="text-xs text-muted-foreground">{options.terms.donationTerms}</p>
              ) : null}

              <Button
                onClick={() => void submit()}
                disabled={pending || !amount.trim() || !categorySlug}
              >
                {pending ? 'Submitting…' : `Continue · ${currency} ${amount || '—'}`}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>More ways</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/give">Giving hub</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/give/campaigns">Browse campaigns</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/member/giving">My giving</Link>
                </Button>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Provider: {options?.provider.displayName || 'Loading…'}. Never enter card
              numbers, CVV, or banking passwords on this page.
            </p>
            {options?.terms?.privacyNote ? (
              <p className="text-xs text-muted-foreground">{options.terms.privacyNote}</p>
            ) : null}
          </div>
        </div>
      </Section>
    </div>
  );
}
