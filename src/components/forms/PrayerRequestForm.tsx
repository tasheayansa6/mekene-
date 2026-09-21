'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiGet, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { publicErrorMessage } from '@/lib/admin/http-error';
import { cn } from '@/lib/utils';

const schema = z.object({
  title: z.string().trim().min(3, 'Please add a short title').max(180),
  content: z.string().trim().min(10, 'Prayer request must be at least 10 characters').max(8000),
  categoryId: z.string().optional(),
  privacy: z.enum(['private', 'public']),
  isAnonymous: z.boolean(),
  name: z.string().optional(),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PrayerOptions {
  guestSubmissionEnabled: boolean;
  privacyNotice: string;
  categories: Array<{ id: string; name: string; slug: string }>;
  captcha: { provider: string; siteKey: string | null } | null;
}

interface PrayerRequestFormProps {
  className?: string;
  compact?: boolean;
}

export function PrayerRequestForm({ className, compact = false }: PrayerRequestFormProps) {
  const { user, status } = useAuth();
  const signedIn = status === 'authenticated' && Boolean(user);
  const [options, setOptions] = useState<PrayerOptions | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      categoryId: '',
      privacy: 'private',
      isAnonymous: false,
      name: '',
      email: '',
      website: '',
    },
  });

  const isAnonymous = form.watch('isAnonymous');

  useEffect(() => {
    void apiGet<PrayerOptions>('/prayer/options').then((result) => {
      if (result.success && result.data) setOptions(result.data);
    });
  }, []);

  async function onSubmit(values: FormValues) {
    setPending(true);
    setError(null);
    const result = await apiPost('/prayer/requests', {
      title: values.title,
      content: values.content,
      categoryId: values.categoryId || null,
      visibility: values.privacy,
      isAnonymous: values.isAnonymous,
      name: values.isAnonymous ? '' : values.name,
      email: values.isAnonymous ? '' : values.email,
      website: values.website,
    });
    setPending(false);
    if (!result.success) {
      setError(publicErrorMessage(result.status, result.message));
      return;
    }
    setSubmitted(true);
    form.reset();
  }

  if (submitted) {
    return (
      <Alert className={cn('border-primary/30 bg-primary/5', className)}>
        <CheckCircle2 className="size-4 text-primary" />
        <AlertTitle>Your prayer request has been received.</AlertTitle>
        <AlertDescription>
          Thank you for allowing us to pray with you.
          {signedIn ? (
            <>
              {' '}
              You can review the status from your member prayer page.
            </>
          ) : null}
        </AlertDescription>
        <Button className="mt-4" variant="outline" onClick={() => setSubmitted(false)}>
          Submit another request
        </Button>
      </Alert>
    );
  }

  const guestAllowed = options?.guestSubmissionEnabled !== false;
  if (!signedIn && options && !guestAllowed) {
    return (
      <Alert className={className}>
        <ShieldCheck className="size-4" />
        <AlertTitle>Sign in to submit a prayer request</AlertTitle>
        <AlertDescription>
          Guest submission is currently turned off. Please sign in with your church account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-6', className)}
        noValidate
      >
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>Privacy</AlertTitle>
          <AlertDescription>
            {options?.privacyNotice ||
              'Prayer requests may be viewed by authorized members of the church prayer team. Please do not include information you do not want shared with the prayer team.'}
          </AlertDescription>
        </Alert>

        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Unable to send</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="sr-only" aria-hidden="true">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input tabIndex={-1} autoComplete="off" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">Submit anonymously</FormLabel>
                <FormDescription>
                  Your name will not appear on any public prayer list.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Submit anonymously"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {!signedIn && !isAnonymous ? (
          <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="prayer-name">Name (optional)</FormLabel>
                  <FormControl>
                    <Input id="prayer-name" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="prayer-email">Email (optional)</FormLabel>
                  <FormControl>
                    <Input id="prayer-email" type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormDescription>Used only if the church sends a receipt. Not shown publicly.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="prayer-title">Title</FormLabel>
              <FormControl>
                <Input id="prayer-title" placeholder="A short title for your request" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="prayer-request">Prayer request</FormLabel>
              <FormControl>
                <Textarea
                  id="prayer-request"
                  rows={compact ? 4 : 6}
                  placeholder="Share what you would like the prayer team to pray about."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="prayer-category">Category</FormLabel>
              <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                <FormControl>
                  <SelectTrigger id="prayer-category">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {(options?.categories || []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="privacy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility</FormLabel>
              <FormDescription>
                Requests stay private by default. Choosing public still requires a moderator to approve it before it appears on the website.
              </FormDescription>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                    <RadioGroupItem value="private" id="privacy-private" className="mt-1" />
                    <span>
                      <span className="block font-medium" id="privacy-private-label">
                        Private
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Only the authorized prayer team will see this request.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                    <RadioGroupItem value="public" id="privacy-public" className="mt-1" />
                    <span>
                      <span className="block font-medium">Public</span>
                      <span className="text-sm text-muted-foreground">
                        May be shared after a moderator reviews it.
                      </span>
                    </span>
                  </label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          <Heart className="mr-2 size-4" />
          {pending ? 'Sending…' : 'Submit prayer request'}
        </Button>
      </form>
    </Form>
  );
}
