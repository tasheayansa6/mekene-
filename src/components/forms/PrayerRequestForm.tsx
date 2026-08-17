'use client';

import { useState } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

const prayerRequestSchema = z.object({
  name: z.string().optional(),
  request: z
    .string()
    .min(10, 'Prayer request must be at least 10 characters'),
  isAnonymous: z.boolean(),
});

type PrayerRequestFormValues = z.infer<typeof prayerRequestSchema>;

interface PrayerRequestFormProps {
  onSubmit?: (data: {
    name: string;
    request: string;
    isAnonymous: boolean;
  }) => void;
  className?: string;
}

export function PrayerRequestForm({
  onSubmit,
  className,
}: PrayerRequestFormProps) {
  const [isAnonymous, setIsAnonymous] = useState(false);

  const form = useForm<PrayerRequestFormValues>({
    resolver: zodResolver(prayerRequestSchema),
    defaultValues: {
      name: '',
      request: '',
      isAnonymous: false,
    },
  });

  function handleSubmit(values: PrayerRequestFormValues) {
    onSubmit?.({
      name: values.isAnonymous ? '' : (values.name ?? ''),
      request: values.request,
      isAnonymous: values.isAnonymous,
    });
    form.reset();
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
                <p className="text-sm text-muted-foreground">
                  Hide your name from the prayer request
                </p>
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

        {/* Name Field */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            isAnonymous ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'
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
                  placeholder="Share your prayer request with us..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-primary/10 text-primary hover:bg-primary/20"
          size="lg"
        >
          <Heart className="mr-2 size-4" />
          Submit Prayer Request
        </Button>
      </form>
    </Form>
  );
}
