import { useState, useEffect, useCallback } from 'react';
import { Building2, Star, Check } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useFetch from '../../../hooks/useFetch';
import { usePermissions } from '../../../hooks/usePermissions';

interface Branch {
  id: string;
  name: string;
  locationCode: string;
  branchCode?: string | null;
  address?: string;
  isActive: boolean;
}

interface BranchesResponse {
  locations: Branch[];
}

interface AssignedBranchResponse {
  locationId: string;
  name: string;
  locationCode: string;
  isPrimary: boolean;
}

interface AssignBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Submit the full set of assigned branch (Location) ids plus the primary one. */
  onSubmit: (staffId: string, branchIds: string[], primaryBranchId: string | null) => Promise<void>;
  staffId: string;
  staffName: string;
}

export default function AssignBranchModal({
  isOpen,
  onClose,
  onSubmit,
  staffId,
  staffName,
}: AssignBranchModalProps) {
  const { isAdmin, isSuperAdmin } = usePermissions();
  const canAssignAllBranches = isAdmin || isSuperAdmin;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  const branchesFetch = useFetch<BranchesResponse>('/locations');
  const myBranchesFetch = useFetch<Array<{ locationId: string; name: string; locationCode: string; isActive?: boolean; address?: string }>>('/staff/me/branches');
  const currentFetch = useFetch<AssignedBranchResponse[]>('/staff/:id/branches');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [branchesRes, currentRes] = await Promise.all([
        canAssignAllBranches
          ? branchesFetch.fetchData({ method: 'GET', silent: true, endpoint: '/locations?limit=100' })
          : myBranchesFetch.fetchData({ method: 'GET', silent: true, endpoint: '/staff/me/branches' }),
        staffId
          ? currentFetch.fetchData({ method: 'GET', silent: true, endpoint: `/staff/${staffId}/branches` })
          : Promise.resolve(null),
      ]);

      if (canAssignAllBranches && branchesRes?.data?.locations) {
        setBranches(branchesRes.data.locations.filter((b: Branch) => b.isActive));
      } else if (!canAssignAllBranches && Array.isArray(branchesRes?.data)) {
        setBranches(
          (branchesRes.data as Array<{ locationId: string; name: string; locationCode: string; isActive?: boolean; address?: string }>).map((branch) => ({
            id: branch.locationId,
            name: branch.name,
            locationCode: branch.locationCode,
            address: branch.address,
            isActive: branch.isActive ?? true,
          })),
        );
      }

      const current = (currentRes?.data as AssignedBranchResponse[] | undefined) || [];
      if (current.length > 0) {
        setSelectedIds(current.map((c) => c.locationId));
        setPrimaryId(current.find((c) => c.isPrimary)?.locationId || current[0].locationId);
      } else {
        setSelectedIds([]);
        setPrimaryId(null);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, staffId]);

  const toggleBranch = (id: string) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      // Keep the primary valid
      setPrimaryId((cur) => {
        if (exists && cur === id) {
          return next[0] || null;
        }
        if (!exists && !cur) {
          return id;
        }
        return cur;
      });
      return next;
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedIds([]);
      setPrimaryId(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const primary = primaryId && selectedIds.includes(primaryId) ? primaryId : selectedIds[0] || null;
      await onSubmit(staffId, selectedIds, primary);
      handleClose();
    } catch (error) {
      console.error('Error assigning branches:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="py-4">
          <div className="flex items-center">
            <Building2 className="mr-3 h-6 w-6 text-orange-600" />
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">Assign Branches</DialogTitle>
              <p className="mt-0.5 text-sm text-gray-600">{staffName}</p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <DialogBody className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-orange-600"></div>
              <p className="mt-2 text-gray-600">Loading branches...</p>
            </div>
          </DialogBody>
        ) : (
          <>
            <DialogBody className="space-y-3 py-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Select one or more branches
                </p>
                <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
              </div>

              {branches.length === 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  No active branches available.
                </p>
              )}

              <div className="space-y-2">
                {branches.map((branch) => {
                  const checked = selectedIds.includes(branch.id);
                  const isPrimary = primaryId === branch.id;
                  return (
                    <div
                      key={branch.id}
                      className={`rounded-lg border px-3 py-2.5 transition ${
                        checked ? 'border-orange-300 bg-orange-50/60' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleBranch(branch.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? 'border-orange-600 bg-orange-600 text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                          aria-pressed={checked}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBranch(branch.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {branch.name}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {branch.branchCode || branch.locationCode}
                            {branch.address ? ` · ${branch.address}` : ''}
                          </span>
                        </button>
                        {checked && (
                          <button
                            type="button"
                            onClick={() => setPrimaryId(branch.id)}
                            title={isPrimary ? 'Primary branch' : 'Set as primary'}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition ${
                              isPrimary
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-gray-400 hover:text-orange-600'
                            }`}
                          >
                            <Star className={`h-3.5 w-3.5 ${isPrimary ? 'fill-orange-500' : ''}`} />
                            {isPrimary ? 'Primary' : 'Set primary'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                The primary branch is the staff member's default. They will choose which assigned
                branch to work in after logging in.
              </p>
            </DialogBody>

            <DialogFooter className="border-t border-gray-200">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-orange-600 text-white hover:bg-orange-700"
              >
                {isSubmitting ? 'Saving...' : selectedIds.length > 0 ? 'Save Branches' : 'Remove All'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
