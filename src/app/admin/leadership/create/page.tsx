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
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  title: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  photoUrl: z.string().optional(),
  positionId: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  isActive: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

export function LeaderForm({ id }: { id?: string }) {
  const router = useRouter();
  const { can } = useAuth();
  const [positions, setPositions] = useState<Array<{ id: string; title: string }>>([]);
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      title: '',
      bio: '',
      email: '',
      phone: '',
      photoUrl: '',
      positionId: 'none',
      status: 'draft',
      isActive: 'true',
    },
  });

  useEffect(() => {
    void apiGet<Array<{ id: string; title: string }>>('/admin/leadership/positions').then(
      (result) => setPositions(result.data || [])
    );
    if (!id) return;
    void apiGet<FormValues & { isActive: boolean; positionId: string | null }>(
      `/admin/leadership/${id}`
    ).then((result) => {
      if (!result.success || !result.data) return;
      const leader = result.data as unknown as {
        firstName: string;
        lastName: string;
        title: string | null;
        bio: string | null;
        email: string | null;
        phone: string | null;
        photoUrl: string | null;
        positionId: string | null;
        status: 'draft' | 'published' | 'archived';
        isActive: boolean;
      };
      form.reset({
        firstName: leader.firstName,
        lastName: leader.lastName,
        title: leader.title || '',
        bio: leader.bio || '',
        email: leader.email || '',
        phone: leader.phone || '',
        photoUrl: leader.photoUrl || '',
        positionId: leader.positionId || 'none',
        status: leader.status,
        isActive: leader.isActive ? 'true' : 'false',
      });
    });
  }, [id, form]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const payload = {
      ...values,
      title: values.title || null,
      bio: values.bio || null,
      email: values.email || null,
      phone: values.phone || null,
      photoUrl: values.photoUrl || null,
      positionId: values.positionId === 'none' ? null : values.positionId,
      isActive: values.isActive === 'true',
    };
    const result = id
      ? await apiPatch(`/admin/leadership/${id}`, payload)
      : await apiPost('/admin/leadership', payload);
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message) || 'Unable to save leader.');
      return;
    }
    toast.success(id ? 'Leader updated successfully.' : 'Leader created.');
    router.push('/admin/leadership');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="positionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No position</SelectItem>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.title}
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
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biography</FormLabel>
              <FormControl>
                <Textarea rows={5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo URL</FormLabel>
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
                <Select value={field.value} onValueChange={field.onChange}>
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
          <Button type="submit" disabled={saving || (id ? !can('leadership.update') : !can('leadership.create'))}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {id ? 'Save changes' : 'Create leader'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/leadership')}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function CreateLeaderPage() {
  return (
    <PermissionGate permission="leadership.create">
      <div className="space-y-6">
        <PageHeader title="Add Leader" description="Create a leadership profile." />
        <LeaderForm />
      </div>
    </PermissionGate>
  );
}
