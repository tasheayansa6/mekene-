'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiGet, apiPatch, apiPost, ensureCsrfToken, apiDelete } from '@/lib/api/client';
import { CSRF_HEADER_NAME } from '@/lib/auth/config';
import { getCsrfToken } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface MemberProfile {
  id: string;
  displayName: string;
  preferredLanguage: string;
  directoryVisibility: string;
  showProfilePhoto: boolean;
  showDisplayName: boolean;
  showMinistry: boolean;
  showContactButton: boolean;
  membershipNumber: string | null;
  status: string;
}

export default function MemberProfilePage() {
  const { user, refresh } = useAuth();
  const [member, setMember] = useState<MemberProfile | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
  const [visibility, setVisibility] = useState('private');
  const [showPhoto, setShowPhoto] = useState(false);
  const [showName, setShowName] = useState(true);
  const [showMinistry, setShowMinistry] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changePending, setChangePending] = useState(false);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [addressNote, setAddressNote] = useState('');

  useEffect(() => {
    void apiGet<{ member: MemberProfile | null }>('/members/me').then((result) => {
      const row = result.data?.member ?? null;
      setMember(row);
      if (row) {
        setDisplayName(row.displayName);
        setLanguage(row.preferredLanguage);
        setVisibility(row.directoryVisibility);
        setShowPhoto(row.showProfilePhoto);
        setShowName(row.showDisplayName);
        setShowMinistry(row.showMinistry);
        setShowContact(row.showContactButton);
      }
    });
  }, []);

  async function save() {
    setPending(true);
    const result = await apiPatch<{ member: MemberProfile }>('/members/me', {
      displayName,
      preferredLanguage: language,
      directoryVisibility: visibility,
      showProfilePhoto: showPhoto,
      showDisplayName: showName,
      showMinistry,
      showContactButton: showContact,
    });
    setPending(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to update profile.');
      return;
    }
    toast.success('Profile updated.');
    if (result.data?.member) setMember(result.data.member);
  }

  async function onAvatar(file: File) {
    setUploading(true);
    await ensureCsrfToken();
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/v1/auth/me/avatar', {
      method: 'POST',
      body,
      credentials: 'include',
      headers: { [CSRF_HEADER_NAME]: getCsrfToken() },
    });
    const json = await res.json();
    setUploading(false);
    if (!json.success) {
      toast.error(json.message || 'Upload failed.');
      return;
    }
    toast.success('Photo updated.');
    await refresh();
  }

  async function removeAvatar() {
    setUploading(true);
    const result = await apiDelete('/auth/me/avatar');
    setUploading(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to remove photo.');
      return;
    }
    toast.success('Photo removed.');
    await refresh();
  }

  async function submitProtectedChanges() {
    setChangePending(true);
    const result = await apiPost('/members/me/profile-changes', {
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      addressNote: addressNote.trim() || undefined,
    });
    setChangePending(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to submit request.');
      return;
    }
    toast.success('Saved');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setAddressNote('');
  }

  if (member === undefined) return <Skeleton className="h-72 w-full" />;

  if (!member) {
    return (
      <Alert>
        <AlertTitle>No membership profile yet</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>You have not submitted a membership application.</p>
          <Button asChild>
            <Link href="/membership/apply">Apply for membership</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Membership status and membership number are managed by the church office.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
          <CardDescription>JPEG, PNG, or WebP. 2MB or smaller.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.profileImage || undefined} alt="" />
            <AvatarFallback>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap gap-2">
            <Label className="cursor-pointer">
              <span className="sr-only">Upload profile photo</span>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onAvatar(file);
                }}
              />
              <Button type="button" variant="outline" asChild>
                <span>{uploading ? <Loader2 className="size-4 animate-spin" /> : 'Upload photo'}</span>
              </Button>
            </Label>
            {user?.profileImage ? (
              <Button type="button" variant="ghost" onClick={() => void removeAvatar()} disabled={uploading}>
                Remove
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory preferences</CardTitle>
          <CardDescription>
            The public directory is off. These settings only apply if the church enables a directory later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Preferred language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="am">Amharic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Directory visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="members_only">Members only</SelectItem>
                <SelectItem value="public">Public (if enabled later)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show-photo">Show profile photo in a directory</Label>
            <Switch id="show-photo" checked={showPhoto} onCheckedChange={setShowPhoto} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show-name">Show display name in a directory</Label>
            <Switch id="show-name" checked={showName} onCheckedChange={setShowName} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show-ministry">Show ministry participation in a directory</Label>
            <Switch id="show-ministry" checked={showMinistry} onCheckedChange={setShowMinistry} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show-contact">Show a contact button in the directory</Label>
            <Switch id="show-contact" checked={showContact} onCheckedChange={setShowContact} />
          </div>
          <Button onClick={() => void save()} disabled={pending}>
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Protected field changes</CardTitle>
          <CardDescription>
            Emergency contact and address updates need church office review. These fields cannot be
            changed with Save preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emergency-name">Emergency contact name</Label>
            <Input
              id="emergency-name"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency-phone">Emergency contact phone</Label>
            <Input
              id="emergency-phone"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address-note">Address note</Label>
            <Input
              id="address-note"
              value={addressNote}
              onChange={(e) => setAddressNote(e.target.value)}
            />
          </div>
          <Button onClick={() => void submitProtectedChanges()} disabled={changePending}>
            {changePending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Submit for review
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
