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
  MapPin,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { adminFetch } from './admin-fetch';
import type { ChurchProfileData, ChurchLocation } from '@/lib/church-api';

// ---- Schema ----

const locationFormSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z
    .string()
    .email('Invalid email')
    .or(z.literal(''))
    .nullable()
    .optional(),
  isMainLocation: z.boolean().default(false),
});

type LocationFormData = z.infer<typeof locationFormSchema>;

const DEFAULT_FORM: LocationFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  region: '',
  country: '',
  latitude: null,
  longitude: null,
  phone: '',
  email: '',
  isMainLocation: false,
};

// ---- Component ----

export function LocationsTab() {
  const [locations, setLocations] = useState<ChurchLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<ChurchLocation | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<ChurchLocation | null>(null);
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
        setLocations(res.data.locations);
      } else {
        setError(res.message || 'Failed to load locations.');
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
    setEditingLocation(null);
    setFormData(DEFAULT_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (loc: ChurchLocation) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      description: loc.description ?? '',
      address: loc.address ?? '',
      city: loc.city ?? '',
      region: loc.region ?? '',
      country: loc.country ?? '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      phone: loc.phone ?? '',
      email: loc.email ?? '',
      isMainLocation: loc.isMainLocation,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const parsed = locationFormSchema.safeParse(formData);
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
        description: parsed.data.description || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        region: parsed.data.region || null,
        country: parsed.data.country || null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
      };

      let res;
      if (editingLocation) {
        res = await adminFetch(
          `/api/v1/church/admin/locations/${editingLocation.id}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        );
      } else {
        res = await adminFetch('/api/v1/church/admin/locations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        toast.success(
          editingLocation
            ? 'Location updated successfully'
            : 'Location created successfully'
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
        `/api/v1/church/admin/locations/${deleteTarget.id}`,
        { method: 'DELETE' }
      );
      if (res.success) {
        toast.success('Location deleted successfully');
        setDeleteTarget(null);
        fetchProfile();
      } else {
        toast.error(res.message || 'Failed to delete location.');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
    }
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
          <h3 className="text-lg font-semibold">Church Locations</h3>
          <p className="text-sm text-muted-foreground">
            Manage church buildings, campuses, and meeting locations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProfile}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Address</TableHead>
              <TableHead className="hidden md:table-cell">City</TableHead>
              <TableHead>Main</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No locations found. Click &quot;Add Location&quot; to create
                  one.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {loc.address || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {loc.city || '—'}
                  </TableCell>
                  <TableCell>
                    {loc.isMainLocation && (
                      <Badge variant="default" className="gap-1">
                        <MapPin className="size-3" />
                        Main
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={loc.isActive ? 'default' : 'secondary'}
                    >
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(loc)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(loc)}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? 'Update the location details.'
                : 'Add a new church location or campus.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="loc-name">Location Name *</Label>
              <Input
                id="loc-name"
                placeholder="e.g. Main Sanctuary"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-desc">Description</Label>
              <Textarea
                id="loc-desc"
                rows={2}
                placeholder="Brief description"
                value={formData.description ?? ''}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-address">Address</Label>
              <Input
                id="loc-address"
                placeholder="Street address"
                value={formData.address ?? ''}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="loc-city">City</Label>
                <Input
                  id="loc-city"
                  placeholder="City"
                  value={formData.city ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-region">Region</Label>
                <Input
                  id="loc-region"
                  placeholder="Region"
                  value={formData.region ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, region: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-country">Country</Label>
                <Input
                  id="loc-country"
                  placeholder="Country"
                  value={formData.country ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, country: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="loc-lat">Latitude</Label>
                <Input
                  id="loc-lat"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  placeholder="9.0250"
                  value={formData.latitude ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      latitude: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    }))
                  }
                />
                {formErrors.latitude && (
                  <p className="text-sm text-destructive">
                    {formErrors.latitude}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-lng">Longitude</Label>
                <Input
                  id="loc-lng"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  placeholder="38.7469"
                  value={formData.longitude ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      longitude: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    }))
                  }
                />
                {formErrors.longitude && (
                  <p className="text-sm text-destructive">
                    {formErrors.longitude}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="loc-phone">Phone</Label>
                <Input
                  id="loc-phone"
                  placeholder="Phone number"
                  value={formData.phone ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-email">Email</Label>
                <Input
                  id="loc-email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, email: e.target.value }))
                  }
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">
                    {formErrors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="loc-main"
                checked={formData.isMainLocation}
                onCheckedChange={(checked) =>
                  setFormData((f) => ({ ...f, isMainLocation: checked }))
                }
              />
              <Label htmlFor="loc-main" className="cursor-pointer">
                Set as main location
              </Label>
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
              {editingLocation ? 'Update' : 'Create'}
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
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action can be undone by reactivating the location later.
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
