'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiPatch, ensureCsrfToken, getCsrfToken } from '@/lib/api/client';
import { CSRF_HEADER_NAME } from '@/lib/auth/config';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { publicErrorMessage } from '@/lib/admin/http-error';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email(),
});

export default function AdminProfilePage() {
  const { user, refresh } = useAuth();
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      email: user?.email || '',
    },
  });

  if (!user) return null;
  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();

  async function onSubmit(values: z.infer<typeof schema>) {
    setPending(true);
    const result = await apiPatch('/auth/me', values);
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message) || 'Unable to update profile.');
      return;
    }
    toast.success(result.message || 'Profile updated.');
    await refresh();
  }

  async function onAvatar(file: File) {
    setUploading(true);
    await ensureCsrfToken();
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/v1/auth/me/avatar', {
      method: 'POST',
      credentials: 'include',
      headers: { [CSRF_HEADER_NAME]: getCsrfToken() },
      body,
    });
    const json = await res.json();
    setUploading(false);
    if (!json.success) {
      toast.error(json.message || 'Unable to upload photo.');
      return;
    }
    toast.success('Profile image updated.');
    await refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Safe account details. Role and privilege changes are not available here." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Read-only status information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-16">
                <AvatarImage src={user.profileImage || undefined} alt="" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <label className="text-sm">
                <span className="sr-only">Upload profile image</span>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onAvatar(file);
                  }}
                />
              </label>
            </div>
            <p>
              <span className="text-sm text-muted-foreground">Role</span>
              <br />
              {user.role.name}
            </p>
            <p>
              <span className="text-sm text-muted-foreground">Status</span>
              <br />
              <Badge>{user.status}</Badge>
            </p>
            <p>
              <span className="text-sm text-muted-foreground">Last login</span>
              <br />
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2" id="account">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Update your name, phone, and email. Password changes use the forgot-password flow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save profile
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
