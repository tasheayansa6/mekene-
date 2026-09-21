'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { ministriesData } from '@/data/ministries';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.'),
  preferredContact: z.string().trim().max(40).optional(),
  preferredLanguage: z.enum(['en', 'am']),
  howHeard: z.string().optional(),
  applicantNote: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ApplicationView {
  id: string;
  status: string;
  statusCode: string;
  reviewerMessage: string | null;
  submittedAt: string;
}

const HOW_HEARD = [
  'Sunday worship service',
  'Family or friend',
  'Church ministry or event',
  'Online',
  'Other',
];

export function MembershipApplyForm() {
  const { user } = useAuth();
  const [existing, setExisting] = useState<ApplicationView | null | undefined>(undefined);
  const [interests, setInterests] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      preferredContact: '',
      preferredLanguage: 'en',
      howHeard: '',
      applicantNote: '',
    },
  });

  useEffect(() => {
    void apiGet<{ application: ApplicationView | null }>('/members/applications/me').then((result) => {
      setExisting(result.data?.application ?? null);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    form.reset({
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      preferredContact: user.phone || '',
      preferredLanguage: 'en',
      howHeard: '',
      applicantNote: '',
    });
  }, [user, form]);

  async function onSubmit(values: FormValues) {
    setPending(true);
    const payload = {
      ...values,
      ministryInterests: interests.join(', ') || undefined,
    };
    const result =
      existing?.statusCode === 'needs_information'
        ? await apiPatch<{ application: ApplicationView }>('/members/applications/me', payload)
        : await apiPost<{ application: ApplicationView }>('/members/applications', payload);
    setPending(false);
    if (!result.success || !result.data) {
      toast.error(result.message || 'Unable to submit the application.');
      return;
    }
    toast.success(result.message || 'Application submitted.');
    setExisting(result.data.application);
  }

  const canUpdate = existing?.statusCode === 'needs_information';
  const locked = existing && !canUpdate;

  return (
    <AuthGuard>
      {existing === undefined ? (
        <p className="text-sm text-muted-foreground">Loading application status…</p>
      ) : locked ? (
        <Alert>
          <AlertTitle>Application {existing.status.toLowerCase()}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              You submitted a membership application on{' '}
              {new Date(existing.submittedAt).toLocaleDateString()}. Current status:{' '}
              <strong>{existing.status}</strong>.
            </p>
            <Button asChild variant="outline">
              <Link href="/member/membership">View membership status</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
            {canUpdate && existing.reviewerMessage ? (
              <Alert>
                <AlertTitle>Additional information requested</AlertTitle>
                <AlertDescription>{existing.reviewerMessage}</AlertDescription>
              </Alert>
            ) : null}

            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold">Basic information</legend>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Full name <span className="text-destructive">required</span>
                    </FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred phone number</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred language</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="am">Amharic</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold">Church information</legend>
              <FormField
                control={form.control}
                name="howHeard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How did you hear about the church?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOW_HEARD.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Ministry interests</p>
                <p className="text-sm text-muted-foreground">Optional. Select any ministries you hope to learn more about.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ministriesData.map((ministry) => {
                    const checked = interests.includes(ministry.name);
                    return (
                      <label key={ministry.slug} className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setInterests((current) =>
                              value
                                ? [...current, ministry.name]
                                : current.filter((name) => name !== ministry.name)
                            );
                          }}
                        />
                        <span>{ministry.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <FormField
                control={form.control}
                name="applicantNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anything else we should know?</FormLabel>
                    <FormControl>
                      <Textarea rows={4} maxLength={500} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {canUpdate ? 'Resubmit application' : 'Submit application'}
            </Button>
          </form>
        </Form>
      )}
    </AuthGuard>
  );
}
