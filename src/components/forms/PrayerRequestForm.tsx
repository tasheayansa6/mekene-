'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

const privacyOptions = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only the prayer team will see your request',
  },
  {
    value: 'prayer-team',
    label: 'Prayer Team',
    description: 'Visible to the designated prayer team members',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'May be shared with the congregation',
  },
] as const;

type PrivacyOption = (typeof privacyOptions)[number]['value'];

const prayerRequestSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  request: z.string().min(10, 'Prayer request must be at least 10 characters'),
  privacy: z.enum(['private', 'prayer-team', 'public']),
  isAnonymous: z.boolean(),
});

type PrayerRequestFormValues = z.infer<typeof prayerRequestSchema>;

interface PrayerRequestFormProps {
  onSubmit?: (data: {
    name: string;
    email: string;
    request: string;
    privacy: PrivacyOption;
    isAnonymous: boolean;
  }) => void;
  className?: string;
  compact?: boolean;
}

export function PrayerRequestForm({
  onSubmit,
  className,
  compact = false,
}: PrayerRequestFormProps) {
  const [isAnonymous, setIsAnonymous] = useState(false);

  const form = useForm<PrayerRequestFormValues>({
    resolver: zodResolver(prayerRequestSchema),
    defaultValues: {
      name: '',
      email: '',
      request: '',
      privacy: 'private',
      isAnonymous: false,
    },
  });

  function handleSubmit(values: PrayerRequestFormValues) {
    onSubmit?.({
      name: values.isAnonymous ? '' : (values.name ?? ''),
      email: values.isAnonymous ? '' : (values.email ?? ''),
      request: values.request,
      privacy: values.privacy,
      isAnonymous: values.isAnonymous,
    });
    form.reset();
    setIsAnonymous(false);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn('space-y-6', className)}
      >
        {/* Anonymous Toggle */}
        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">
                  Submit Anonymously
                </FormLabel>
                <FormDescription>
                  Hide your name and email from the request
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={(checked) => {
                    setIsAnonymous(checked);
                    field.onChange(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Name & Email Fields */}
        <div
          className={cn(
            'grid gap-4 overflow-hidden transition-all duration-300 ease-in-out',
            isAnonymous ? 'max-h-0 opacity-0 grid-rows-[0fr]' : 'max-h-40 opacity-100 grid-rows-[1fr]',
            compact ? 'grid-cols-1' : 'sm:grid-cols-2'
          )}
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="prayer-name">Your Name</FormLabel>
                <FormControl>
                  <Input
                    id="prayer-name"
                    placeholder="Enter your name"
                    autoComplete="name"
                    {...field}
                  />
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
                <FormLabel htmlFor="prayer-email">Email Address</FormLabel>
                <FormControl>
                  <Input
                    id="prayer-email"
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Prayer Request */}
        <FormField
          control={form.control}
          name="request"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="prayer-request">Prayer Request</FormLabel>
              <FormControl>
                <Textarea
                  id="prayer-request"
                  placeholder="Share your prayer need with us..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Privacy Preference */}
        <FormField
          control={form.control}
          name="privacy"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Privacy Preference
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="space-y-2"
                >
                  {privacyOptions.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`privacy-${option.value}`}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                        field.value === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`privacy-${option.value}`}
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-none">
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
        >
          <Heart className="mr-2 size-4" />
          Submit Prayer Request
        </Button>
      </form>
    </Form>
  );
}
