'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { adminFetch } from './admin-fetch';
import type { ChurchProfileData, ChurchSocialLink } from '@/lib/church-api';

// ---- Constants ----

const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'other', label: 'Other' },
] as const;

// ---- Schema ----

const socialLinkFormSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  url: z.string().min(1, 'URL is required').url('Invalid URL format'),
  displayName: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

type SocialLinkFormData = z.infer<typeof socialLinkFormSchema>;

const DEFAULT_FORM: SocialLinkFormData = {
  platform: '',
  url: '',
  displayName: '',
  sortOrder: 0,
};

// ---- Component ----

export function SocialLinksTab() {
  const [links, setLinks] = useState<ChurchSocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ChurchSocialLink | null>(
    null
  );
  const [formData, setFormData] = useState<SocialLinkFormData>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<ChurchSocialLink | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  // ---- Fetch ----

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<ChurchProfileData>(
        '/api/v1/church/admin/profile'
      );
      if (res.success && res.data) {
        setLinks(res.data.socialLinks);
      } else {
        setError(res.message || 'Failed to load social links.');
      }
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ---- Form helpers ----

  const openCreateDialog = () => {
    setEditingLink(null);
    setFormData(DEFAULT_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (link: ChurchSocialLink) => {
    setEditingLink(link);
    setFormData({
      platform: link.platform,
      url: link.url,
      displayName: link.displayName ?? '',
      sortOrder: link.sortOrder,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const parsed = socialLinkFormSchema.safeParse(formData);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join('.')] = issue.message;
      }
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...parsed.data,
        displayName: parsed.data.displayName || null,
      };

      let res;
      if (editingLink) {
        res = await adminFetch(
          `/api/v1/church/admin/social-links/${editingLink.id}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        );
      } else {
        res = await adminFetch('/api/v1/church/admin/social-links', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        toast.success(
          editingLink
            ? 'Social link updated successfully'
            : 'Social link created successfully'
        );
        setDialogOpen(false);
        fetchProfile();
      } else {
        const msg =
          res.errors && Object.keys(res.errors).length > 0
            ? Object.values(res.errors)
                .flat()
                .join('. ')
            : res.message || 'Operation failed.';
        toast.error(msg);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminFetch(
        `/api/v1/church/admin/social-links/${deleteTarget.id}`,
        { method: 'DELETE' }
      );
      if (res.success) {
        toast.success('Social link deleted successfully');
        setDeleteTarget(null);
        fetchProfile();
      } else {
        toast.error(res.message || 'Failed to delete social link.');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
    }
  };

  const getPlatformLabel = (platform: string) => {
    const found = SOCIAL_PLATFORMS.find((p) => p.value === platform);
    return found?.label ?? platform;
  };

  // ---- Render ----

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Social Media Links</h3>
          <p className="text-sm text-muted-foreground">
            Manage your church's social media presence.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProfile}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            Add Link
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="hidden sm:table-cell">
                Display Name
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No social links found. Click &quot;Add Link&quot; to create
                  one.
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    {getPlatformLabel(link.platform)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    <span className="text-muted-foreground" title={link.url}>
                      {link.url}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {link.displayName || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={link.isActive ? 'default' : 'secondary'}
                    >
                      {link.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(link)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(link)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLink ? 'Edit Social Link' : 'Add Social Link'}
            </DialogTitle>
            <DialogDescription>
              {editingLink
                ? 'Update the social media link details.'
                : 'Add a new social media link for your church.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sl-platform">Platform *</Label>
              <Select
                value={formData.platform}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, platform: v }))
                }
              >
                <SelectTrigger id="sl-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.platform && (
                <p className="text-sm text-destructive">
                  {formErrors.platform}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sl-url">URL *</Label>
              <Input
                id="sl-url"
                placeholder="https://..."
                value={formData.url}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, url: e.target.value }))
                }
              />
              {formErrors.url && (
                <p className="text-sm text-destructive">{formErrors.url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sl-display">Display Name</Label>
              <Input
                id="sl-display"
                placeholder="e.g. Follow us on Facebook"
                value={formData.displayName ?? ''}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, displayName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sl-order">Sort Order</Label>
              <Input
                id="sl-order"
                type="number"
                min={0}
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingLink ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Social Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the{' '}
              {deleteTarget
                ? getPlatformLabel(deleteTarget.platform)
                : ''}{' '}
              link? This action can be undone by reactivating the link later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
