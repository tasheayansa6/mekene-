'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Save, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { adminFetch } from './admin-fetch';
import type { ChurchProfileData } from '@/lib/church-api';

// ---- Schema ----

const profileSchema = z.object({
  name: z.string().min(1, 'Church name is required'),
  shortName: z.string().nullable().optional(),
  nameNative: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  welcomeMessage: z.string().nullable().optional(),
  history: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  mission: z.string().nullable().optional(),
  beliefs: z.string().nullable().optional(),
  coreValues: z.string().nullable().optional(),
  worshipInfo: z.string().nullable().optional(),
  logoUrl: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  faviconUrl: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  ogImageUrl: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  email: z.string().email('Invalid email').or(z.literal('')).nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  denomination: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  status: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ---- Component ----

export function ProfileTab() {
  const [profile, setProfile] = useState<ChurchProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      shortName: '',
      nameNative: '',
      description: '',
      welcomeMessage: '',
      history: '',
      vision: '',
      mission: '',
      beliefs: '',
      coreValues: '',
      worshipInfo: '',
      logoUrl: '',
      faviconUrl: '',
      ogImageUrl: '',
      email: '',
      phone: '',
      website: '',
      denomination: '',
      language: '',
      status: 'draft',
    },
  });

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<ChurchProfileData>(
        '/api/v1/church/admin/profile'
      );
      if (res.success && res.data) {
        setProfile(res.data);
        reset({
          name: res.data.name ?? '',
          shortName: res.data.shortName ?? '',
          nameNative: res.data.nameNative ?? '',
          description: res.data.description ?? '',
          welcomeMessage: res.data.welcomeMessage ?? '',
          history: res.data.history ?? '',
          vision: res.data.vision ?? '',
          mission: res.data.mission ?? '',
          beliefs: res.data.beliefs ?? '',
          coreValues: res.data.coreValues ?? '',
          worshipInfo: res.data.worshipInfo ?? '',
          logoUrl: res.data.logoUrl ?? '',
          faviconUrl: res.data.faviconUrl ?? '',
          ogImageUrl: res.data.ogImageUrl ?? '',
          email: res.data.email ?? '',
          phone: res.data.phone ?? '',
          website: res.data.website ?? '',
          denomination: res.data.denomination ?? '',
          language: res.data.language ?? '',
          status: (res.data as Record<string, unknown>).status as string ?? 'draft',
        });
      } else {
        setError(res.message || 'Failed to load church profile.');
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    setError(null);
    try {
      // Convert empty strings to null for nullable fields
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === '') {
          payload[key] = null;
        } else {
          payload[key] = value;
        }
      }

      const res = await adminFetch<ChurchProfileData>(
        '/api/v1/church/admin/profile',
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );

      if (res.success) {
        toast.success('Profile updated successfully');
        if (res.data) setProfile(res.data);
      } else {
        const msg =
          res.errors && Object.keys(res.errors).length > 0
            ? Object.values(res.errors)
                .flat()
                .join('. ')
            : res.message || 'Failed to update profile.';
        setError(msg);
        toast.error('Failed to update profile');
      }
    } catch {
      setError('Unable to connect to the server.');
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Core details about your church displayed across the website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Church Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name</Label>
              <Input
                id="shortName"
                placeholder="e.g. BME Church"
                {...register('shortName')}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nameNative">Native Name</Label>
              <Input id="nameNative" {...register('nameNative')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="denomination">Denomination</Label>
              <Input id="denomination" {...register('denomination')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input id="language" {...register('language')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-sm text-destructive">
                  {errors.website.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="A brief description of your church"
              {...register('description')}
            />
          </div>
        </CardContent>
      </Card>

      {/* About Content */}
      <Card>
        <CardHeader>
          <CardTitle>About Content</CardTitle>
          <CardDescription>
            Content displayed on the About page of the website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              rows={3}
              placeholder="A warm welcome message for visitors"
              {...register('welcomeMessage')}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="history">Church History</Label>
            <Textarea
              id="history"
              rows={6}
              placeholder="The history of your church..."
              {...register('history')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vision">Vision</Label>
              <Textarea
                id="vision"
                rows={4}
                placeholder="The church's vision..."
                {...register('vision')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mission">Mission</Label>
              <Textarea
                id="mission"
                rows={4}
                placeholder="The church's mission..."
                {...register('mission')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beliefs">
              Beliefs{' '}
              <span className="text-xs text-muted-foreground">
                (Separate beliefs with blank lines. Use &quot;Title&quot; on
                first line, content on following lines.)
              </span>
            </Label>
            <Textarea
              id="beliefs"
              rows={6}
              placeholder={`The Authority of Scripture\nWe believe the Bible is the inspired Word of God...\n\nThe Trinity\nWe believe in one God...`}
              {...register('beliefs')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coreValues">
              Core Values{' '}
              <span className="text-xs text-muted-foreground">
                {'(Enter as JSON array: [{"title": "...", "description": "..."}])'}
              </span>
            </Label>
            <Textarea
              id="coreValues"
              rows={4}
              placeholder='[{"title": "Faith", "description": "..."}]'
              {...register('coreValues')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worshipInfo">Worship Information</Label>
            <Textarea
              id="worshipInfo"
              rows={4}
              placeholder="Information about worship services and practices..."
              {...register('worshipInfo')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact & Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Contact &amp; Branding</CardTitle>
          <CardDescription>
            Contact information and branding assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                placeholder="info@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+251-XX-XXX-XXXX"
                {...register('phone')}
              />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                placeholder="https://..."
                {...register('logoUrl')}
              />
              {errors.logoUrl && (
                <p className="text-sm text-destructive">
                  {errors.logoUrl.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="faviconUrl">Favicon URL</Label>
              <Input
                id="faviconUrl"
                placeholder="https://..."
                {...register('faviconUrl')}
              />
              {errors.faviconUrl && (
                <p className="text-sm text-destructive">
                  {errors.faviconUrl.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ogImageUrl">OG Image URL</Label>
              <Input
                id="ogImageUrl"
                placeholder="https://..."
                {...register('ogImageUrl')}
              />
              {errors.ogImageUrl && (
                <p className="text-sm text-destructive">
                  {errors.ogImageUrl.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Status */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
          <CardDescription>
            Control the publication status of church information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Content Status</Label>
              <Select
                value={watch('status') || 'draft'}
                onValueChange={(v) => setValue('status', v, { shouldDirty: true })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only &quot;Published&quot; content is visible on the public website.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || !isDirty}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          <Save className="mr-2 size-4" />
          Save Changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={fetchProfile}
          disabled={loading}
        >
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>
    </form>
  );
}
