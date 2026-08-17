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
import { Textarea } from '@/components/ui/textarea';
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
import type { ChurchProfileData, ChurchServiceSchedule } from '@/lib/church-api';

// ---- Constants ----

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const serviceFormSchema = z.object({
  dayOfWeek: z.string().min(1, 'Day is required'),
  serviceName: z.string().min(1, 'Service name is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

const DEFAULT_FORM: ServiceFormData = {
  dayOfWeek: '',
  serviceName: '',
  startTime: '',
  endTime: '',
  description: '',
  location: '',
  sortOrder: 0,
};

// ---- Helpers ----

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatTimeRange(start: string, end: string | null) {
  const s = formatTime(start);
  if (!end) return s;
  return `${s} – ${formatTime(end)}`;
}

// ---- Component ----

export function ServicesTab() {
  const [services, setServices] = useState<ChurchServiceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<ChurchServiceSchedule | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] =
    useState<ChurchServiceSchedule | null>(null);
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
        setServices(res.data.serviceSchedules);
      } else {
        setError(res.message || 'Failed to load service schedules.');
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
    setEditingService(null);
    setFormData(DEFAULT_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (service: ChurchServiceSchedule) => {
    setEditingService(service);
    setFormData({
      dayOfWeek: service.dayOfWeek,
      serviceName: service.serviceName,
      startTime: service.startTime,
      endTime: service.endTime ?? '',
      description: service.description ?? '',
      location: service.location ?? '',
      sortOrder: service.sortOrder,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const parsed = serviceFormSchema.safeParse(formData);
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
        endTime: parsed.data.endTime || null,
        description: parsed.data.description || null,
        location: parsed.data.location || null,
      };

      let res;
      if (editingService) {
        res = await adminFetch(
          `/api/v1/church/admin/services/${editingService.id}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        );
      } else {
        res = await adminFetch('/api/v1/church/admin/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        toast.success(
          editingService
            ? 'Service updated successfully'
            : 'Service created successfully'
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
        `/api/v1/church/admin/services/${deleteTarget.id}`,
        { method: 'DELETE' }
      );
      if (res.success) {
        toast.success('Service deleted successfully');
        setDeleteTarget(null);
        fetchProfile();
      } else {
        toast.error(res.message || 'Failed to delete service.');
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
          <h3 className="text-lg font-semibold">Service Schedules</h3>
          <p className="text-sm text-muted-foreground">
            Manage your weekly worship service times.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProfile}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Service Name</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No service schedules found. Click &quot;Add Service&quot; to
                  create one.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">
                    {service.dayOfWeek}
                  </TableCell>
                  <TableCell>{service.serviceName}</TableCell>
                  <TableCell>
                    {formatTimeRange(service.startTime, service.endTime)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {service.location || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        service.isActive ? 'default' : 'secondary'
                      }
                    >
                      {service.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(service)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(service)}
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
              {editingService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? 'Update the service schedule details.'
                : 'Add a new service schedule to your church.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="svc-day">Day *</Label>
              <Select
                value={formData.dayOfWeek}
                onValueChange={(v) =>
                  setFormData((f) => ({ ...f, dayOfWeek: v }))
                }
              >
                <SelectTrigger id="svc-day">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.dayOfWeek && (
                <p className="text-sm text-destructive">
                  {formErrors.dayOfWeek}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-name">Service Name *</Label>
              <Input
                id="svc-name"
                placeholder="e.g. Worship Service"
                value={formData.serviceName}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, serviceName: e.target.value }))
                }
              />
              {formErrors.serviceName && (
                <p className="text-sm text-destructive">
                  {formErrors.serviceName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="svc-start">Start Time *</Label>
                <Input
                  id="svc-start"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, startTime: e.target.value }))
                  }
                />
                {formErrors.startTime && (
                  <p className="text-sm text-destructive">
                    {formErrors.startTime}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-end">End Time</Label>
                <Input
                  id="svc-end"
                  type="time"
                  value={formData.endTime ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-location">Location</Label>
              <Input
                id="svc-location"
                placeholder="e.g. Main Sanctuary"
                value={formData.location ?? ''}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-desc">Description</Label>
              <Textarea
                id="svc-desc"
                rows={2}
                placeholder="Brief description of this service"
                value={formData.description ?? ''}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-order">Sort Order</Label>
              <Input
                id="svc-order"
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
              {editingService ? 'Update' : 'Create'}
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
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deleteTarget?.serviceName}&quot;
              service on {deleteTarget?.dayOfWeek}? This action can be undone by
              reactivating the service later.
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
