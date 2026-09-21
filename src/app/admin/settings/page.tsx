'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { TIMEZONES } from '@/lib/admin/validation';
import { publicErrorMessage } from '@/lib/admin/http-error';
import { Skeleton } from '@/components/ui/skeleton';

interface SettingsData {
  siteName: string | null;
  siteDescription: string | null;
  contactEmail: string | null;
  churchLanguage: string | null;
  timezone: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  prayerGuestSubmission: boolean;
  prayerPublicIndex: boolean;
  prayerEmailConfirmation: boolean;
  membershipNumberPrefix?: string;
}

export default function AdminSettingsPage() {
  const { can } = useAuth();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa');
  const [language, setLanguage] = useState('en');
  const [maintenance, setMaintenance] = useState(false);
  const [guestPrayer, setGuestPrayer] = useState(true);
  const [prayerIndex, setPrayerIndex] = useState(false);
  const [prayerEmail, setPrayerEmail] = useState(false);
  const [membershipPrefix, setMembershipPrefix] = useState('BME');
  const [saving, setSaving] = useState(false);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const canManage = can('settings.manage');

  useEffect(() => {
    void apiGet<SettingsData>('/admin/settings').then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        setLoading(false);
        return;
      }
      setData(result.data);
      setTimezone(result.data.timezone);
      setLanguage(result.data.defaultLanguage);
      setMaintenance(result.data.maintenanceMode);
      setGuestPrayer(result.data.prayerGuestSubmission);
      setPrayerIndex(result.data.prayerPublicIndex);
      setPrayerEmail(result.data.prayerEmailConfirmation);
      setMembershipPrefix(result.data.membershipNumberPrefix || 'BME');
      setLoading(false);
    });
  }, []);

  async function save(nextMaintenance = maintenance) {
    setSaving(true);
    const result = await apiPatch<SettingsData>('/admin/settings', {
      timezone,
      defaultLanguage: language,
      maintenanceMode: nextMaintenance,
      prayerGuestSubmission: guestPrayer,
      prayerPublicIndex: prayerIndex,
      prayerEmailConfirmation: prayerEmail,
      membershipNumberPrefix: membershipPrefix,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Settings updated.');
    if (result.data) {
      setData(result.data);
      setMaintenance(result.data.maintenanceMode);
      setGuestPrayer(result.data.prayerGuestSubmission);
      setPrayerIndex(result.data.prayerPublicIndex);
      setPrayerEmail(result.data.prayerEmailConfirmation);
    }
  }

  if (loading) return <Skeleton className="h-72 w-full" />;

  return (
    <PermissionGate permission="settings.view">
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="System configuration. Church name, description, and contact email are managed in Church Information."
        />
        {error ? <ApiErrorAlert message={error} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Values stored as church system settings. Profile fields are not duplicated here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label>Site name</Label>
              <Input value={data?.siteName || ''} disabled />
              <p className="text-xs text-muted-foreground">
                Edit in{' '}
                <Link className="underline" href="/admin/church">
                  Church Information
                </Link>
                .
              </p>
            </div>
            <div className="space-y-2">
              <Label>Site description</Label>
              <Input value={data?.siteDescription || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input value={data?.contactEmail || ''} disabled />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default language</Label>
                <Select value={language} onValueChange={setLanguage} disabled={!canManage}>
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
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled={!canManage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership numbers</CardTitle>
            <CardDescription>
              Assigned on approval. The number is not an authentication credential.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="membership-prefix">Prefix</Label>
            <Input
              id="membership-prefix"
              value={membershipPrefix}
              maxLength={8}
              onChange={(e) => setMembershipPrefix(e.target.value.toUpperCase())}
              disabled={!canManage}
            />
            <p className="text-sm text-muted-foreground">Example: {membershipPrefix || 'BME'}-000001</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Session length and password policy are defined in the authentication configuration, not editable here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            HTTP-only sessions, CSRF protection, and role-based access are already enabled.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Email delivery is configured through environment variables.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Development uses the console email backend. SMTP settings will be added when a mail provider is connected.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Coming Soon</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Coming Soon</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prayer privacy</CardTitle>
            <CardDescription>
              Prayer requests can contain sensitive information. Public indexing stays off unless an administrator turns it on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="guest-prayer">Allow guest submissions</Label>
                <p className="text-sm text-muted-foreground">Visitors can submit without an account. Optional name and email only.</p>
              </div>
              <Switch
                id="guest-prayer"
                checked={guestPrayer}
                disabled={!canManage}
                onCheckedChange={setGuestPrayer}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="prayer-index">Allow search engines to index public prayer pages</Label>
                <p className="text-sm text-muted-foreground">Off by default (noindex). Approved public requests are still not added to the sitemap.</p>
              </div>
              <Switch
                id="prayer-index"
                checked={prayerIndex}
                disabled={!canManage}
                onCheckedChange={setPrayerIndex}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="prayer-email">Send receipt emails when an address is provided</Label>
                <p className="text-sm text-muted-foreground">Receipts never include the prayer request text.</p>
              </div>
              <Switch
                id="prayer-email"
                checked={prayerEmail}
                disabled={!canManage}
                onCheckedChange={setPrayerEmail}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>Maintenance mode hides the public site from visitors. Administrators can still use this dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="maintenance">Maintenance mode</Label>
              <p className="text-sm text-muted-foreground">Off by default.</p>
            </div>
            <Switch
              id="maintenance"
              checked={maintenance}
              disabled={!canManage}
              onCheckedChange={(checked) => {
                if (checked) setConfirmMaintenance(true);
                else {
                  setMaintenance(false);
                  void save(false);
                }
              }}
            />
          </CardContent>
        </Card>

        {canManage ? (
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save settings
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can view these settings. Changing them requires Super Administrator permission.
          </p>
        )}

        <ConfirmDialog
          open={confirmMaintenance}
          onOpenChange={setConfirmMaintenance}
          title="Enable maintenance mode?"
          description="Public visitors will see a maintenance page. Administrators will still be able to sign in and use this dashboard."
          confirmLabel="Enable"
          onConfirm={async () => {
            setConfirmMaintenance(false);
            setMaintenance(true);
            await save(true);
          }}
        />
      </div>
    </PermissionGate>
  );
}
