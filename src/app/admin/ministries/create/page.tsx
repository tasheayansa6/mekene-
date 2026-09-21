'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { publicErrorMessage } from '@/lib/admin/http-error';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  leaderName: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  isActive: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

export function MinistryForm({ id }: { id?: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      leaderName: '',
      category: '',
      imageUrl: '',
      status: 'draft',
      isActive: 'true',
    },
  });

  useEffect(() => {
    if (!id) return;
    void apiGet<FormValues & { isActive: boolean }>(`/admin/ministries/${id}`).then((result) => {
      if (!result.success || !result.data) return;
      const ministry = result.data as unknown as FormValues & { isActive: boolean };
      form.reset({
        name: ministry.name,
        slug: ministry.slug || '',
        description: ministry.description || '',
        leaderName: ministry.leaderName || '',
        category: ministry.category || '',
        imageUrl: ministry.imageUrl || '',
        status: ministry.status,
        isActive: ministry.isActive ? 'true' : 'false',
      });
    });
  }, [id, form]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const payload = {
      ...values,
      slug: values.slug || undefined,
      description: values.description || null,
      leaderName: values.leaderName || null,
      category: values.category || null,
      imageUrl: values.imageUrl || null,
      isActive: values.isActive === 'true',
    };
    const result = id
      ? await apiPatch(`/admin/ministries/${id}`, payload)
      : await apiPost('/admin/ministries', payload);
    setSaving(false);
    if (!result.success) {
      toast.error(
        publicErrorMessage(result.status, result.message) || 'Unable to update ministry. Please try again.'
      );
      return;
    }
    toast.success(id ? 'Ministry updated successfully.' : 'Ministry created.');
    router.push('/admin/ministries');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="auto-generated if empty" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="Worship, Youth, Outreach…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="leaderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leader name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!can('ministries.manage') && !can('ministries.publish') && Boolean(id)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Active</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {id ? 'Save changes' : 'Create ministry'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/ministries')}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function CreateMinistryPage() {
  return (
    <PermissionGate permission="ministries.create">
      <div className="space-y-6">
        <PageHeader title="Add Ministry" description="Create a ministry record." />
        <MinistryForm />
      </div>
    </PermissionGate>
  );
}
