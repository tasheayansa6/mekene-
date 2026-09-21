'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiPatch, ensureCsrfToken } from '@/lib/api/client';
import { CSRF_HEADER_NAME } from '@/lib/auth/config';
import { getCsrfToken } from '@/lib/api/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Section } from '@/components/layout/Section';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  email: z.string().email(),
});

function ProfileInner() {
  const { user, refresh } = useAuth();
  const searchParams = useSearchParams();
  const forbidden = searchParams.get('error') === 'forbidden';
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

  async function onSubmit(values: z.infer<typeof schema>) {
    setPending(true);
    const result = await apiPatch('/auth/me', values);
    setPending(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to update profile.');
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
      toast.error(json.message || 'Unable to upload image.');
      return;
    }
    toast.success('Profile image updated.');
    await refresh();
  }

  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();

  return (
    <Section>
      <div className="mx-auto max-w-2xl space-y-6">
        {forbidden ? (
          <Alert variant="destructive">
            <AlertDescription>
              You do not have access to the administration area.
            </AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Your profile</CardTitle>
            <CardDescription>
              Update your personal details. Role and account status can only be
              changed by authorized administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={user.profileImage || undefined} alt="" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar">Profile image</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="mt-1"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onAvatar(file);
                  }}
                />
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Role:</span> {user.role.name}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {user.status}
              </p>
              <p>
                <span className="text-muted-foreground">Verified:</span>{' '}
                {user.isVerified ? 'Yes' : 'No'}
              </p>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Changing your email sends a confirmation link to the new address.
                </p>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Suspense>
        <ProfileInner />
      </Suspense>
    </AuthGuard>
  );
}
