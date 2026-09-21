'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { useAuth } from '@/hooks/use-auth';

interface Category {
  id: string;
  name: string;
}

export default function CareRequestPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [preferredContact, setPreferredContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void apiGet<{ categories: Category[] }>('/public/care/info').then((result) => {
      if (result.success && result.data?.categories) {
        setCategories(result.data.categories);
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push('/login?next=/care/request');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await apiPost('/member/care', {
      type: 'care_request',
      title,
      description,
      categoryId: categoryId || undefined,
      preferredContact: preferredContact || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage('Your care request was submitted. The care team will follow up privately.');
    setTitle('');
    setDescription('');
    setPreferredContact('');
  }

  return (
    <div className="page-transition">
      <PageHero
        title="Request pastoral care"
        subtitle="Confidential"
        description="Share only what you are comfortable sharing. Internal pastoral notes are never shown here."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Care', href: '/care' },
          { label: 'Request' },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-xl space-y-4">
          {!authLoading && !user ? (
            <p className="text-sm text-muted-foreground">
              Please{' '}
              <Link className="underline" href="/login?next=/care/request">
                sign in
              </Link>{' '}
              to submit a care request.
            </p>
          ) : null}
          {error ? <ApiErrorAlert message={error} /> : null}
          {message ? <p className="text-sm text-green-700" role="status">{message}</p> : null}
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="title">Request title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={180}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Type (optional)</Label>
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Share a brief overview. Avoid unnecessary sensitive detail in this form."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Preferred contact method (optional)</Label>
              <Input
                id="contact"
                value={preferredContact}
                onChange={(e) => setPreferredContact(e.target.value)}
                placeholder="Phone, email, or in person"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pastoral care is spiritual support and does not replace medical, psychiatric,
              legal, or emergency services.
            </p>
            <Button type="submit" disabled={submitting || authLoading}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </form>
        </div>
      </Section>
    </div>
  );
}
