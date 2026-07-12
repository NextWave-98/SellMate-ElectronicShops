import { useEffect, useState, useCallback } from 'react';
import { 
  Shield, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  ChevronDown, 
  ChevronRight,
  Lock,
  Unlock,
  CheckSquare,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import { useRole } from '../../hooks/useRole';
import { usePermissionManagement } from '../../hooks/usePermissionManagement';
import { useStaff } from '../../hooks/useStaff';
import { usePermissions } from '../../hooks/usePermissions';
import type { Permission } from '../../types/permission.types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  _count?: {
    users: number;
  };
}

export default function RoleManagementPage() {
  const { hasPermission, isSuperAdmin, isOrganizationAdmin } = usePermissions();
  const { getAllRoles, createRole, updateRole, deleteRole } = useRole();
  const { getAllPermissions, groupPermissionsByModule } = usePermissionManagement();
  const { getAllStaff } = useStaff();

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionNames: [] as string[],
  });

  // Check if user has permission to manage roles
  const canManageRoles = hasPermission('roles.manage') || isSuperAdmin;

  useEffect(() => {
    if (!canManageRoles) {
      toast.error('You do not have permission to manage roles');
      return;
    }
    loadData();
  }, [canManageRoles]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesResponse, permissionsResponse] = await Promise.all([
        getAllRoles({ limit: 100 }),
        getAllPermissions({ limit: 500 }),
      ]);

      if (rolesResponse?.roles) {
        setRoles(rolesResponse.roles);
      }

      if (permissionsResponse?.success && permissionsResponse.data) {
        const permissionsList = Array.isArray(permissionsResponse.data)
          ? permissionsResponse.data
          : (permissionsResponse.data as { permissions?: Permission[] }).permissions || [];
        setAllPermissions(permissionsList);
        const grouped = groupPermissionsByModule(permissionsList);
        setGroupedPermissions(grouped);
        setExpandedModules(new Set(grouped.map((g: any) => g.module)));
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffForRole = async (roleId: string) => {
    try {
      const response = await getAllStaff({ roleId, limit: 100 });
      if (response?.staff) {
        setStaffList(response.staff);
      }
    } catch (error) {
      toast.error('Failed to load staff');
      console.error(error);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      await createRole({
        name: formData.name,
        description: formData.description || undefined,
        permissionNames: formData.permissionNames,
      });
      toast.success('Role created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      await updateRole(selectedRole.id, {
        name: formData.name,
        description: formData.description || undefined,
        permissionNames: formData.permissionNames,
      });
      toast.success('Role updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?._count?.users && role._count.users > 0) {
      toast.error(`Cannot delete role "${roleName}". It is assigned to ${role._count.users} user(s).`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return;
    }

    try {
      await deleteRole(roleId);
      toast.success('Role deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete role');
    }
  };

  const openEditModal = (role: Role) => {
    if (role.isSystem) {
      toast.error('System roles cannot be edited');
      return;
    }
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionNames: role.permissions.map(p => p.name),
    });
    setIsEditModalOpen(true);
  };

  const openAssignModal = (role: Role) => {
    setSelectedRole(role);
    loadStaffForRole(role.id);
    setIsAssignModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissionNames: [],
    });
    setSelectedRole(null);
  };

  const togglePermission = (permissionName: string) => {
    setFormData(prev => ({
      ...prev,
      permissionNames: prev.permissionNames.includes(permissionName)
        ? prev.permissionNames.filter(p => p !== permissionName)
        : [...prev.permissionNames, permissionName],
    }));
  };

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  const selectAllInModule = (module: string) => {
    const group = groupedPermissions.find(g => g.module === module);
    if (!group) return;

    const modulePermissionNames = group.permissions.map((p: Permission) => p.name);
    const allSelected = modulePermissionNames.every((name: string) =>
      formData.permissionNames.includes(name)
    );

    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permissionNames: prev.permissionNames.filter(
          p => !modulePermissionNames.includes(p)
        ),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissionNames: [...new Set([...prev.permissionNames, ...modulePermissionNames])],
      }));
    }
  };

  const closeRoleModal = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    resetForm();
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!canManageRoles) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to manage roles.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
                Role Management
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                Create custom roles and assign permissions to staff members
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="self-start sm:self-auto bg-indigo-600 hover:bg-indigo-700 text-sm"
            >
              <Plus className="h-5 w-5" />
              Create Role
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className={`glass-card p-6 hover:shadow-lg transition-shadow ${
                role.isSystem ? 'border-2 border-white/40' : 'border-2 border-transparent'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <Lock className="h-4 w-4 text-gray-500" title="System Role" />
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {role.description || 'No description'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  <span>{role.permissions.length} permissions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{role._count?.users || 0} users</span>
                </div>
              </div>

              <div className="flex gap-2">
                {!role.isSystem && (
                  <>
                    <Button
                      onClick={() => openEditModal(role)}
                      variant="outline"
                      className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-0"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteRole(role.id, role.name)}
                      variant="outline"
                      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border-0"
                      disabled={role._count?.users && role._count.users > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => openAssignModal(role)}
                  variant="outline"
                  className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 border-0"
                >
                  <Users className="h-4 w-4" />
                  View Staff
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No roles found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={isCreateModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) closeRoleModal();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(90vh,100dvh)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <DialogHeader className="flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-2xl">
              {isCreateModalOpen ? 'Create New Role' : 'Edit Role'}
            </DialogTitle>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" className="relative z-30 shrink-0">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <DialogBody className="space-y-6 pb-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name *</Label>
                <Input
                  id="role-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Branch Manager, Sales Staff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the role responsibilities..."
                />
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold">
                Assign Permissions ({formData.permissionNames.length} selected)
              </h3>
              <div className="space-y-2">
                {groupedPermissions.map((group) => {
                  const modulePermissionNames = group.permissions.map((p: Permission) => p.name);
                  const allSelected = modulePermissionNames.every((name: string) =>
                    formData.permissionNames.includes(name)
                  );
                  const someSelected = modulePermissionNames.some((name: string) =>
                    formData.permissionNames.includes(name)
                  );

                  return (
                    <div key={group.module} className="glass-card overflow-hidden">
                      <div
                        className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/30"
                        onClick={() => toggleModule(group.module)}
                      >
                        <div className="flex flex-1 items-center gap-3">
                          {expandedModules.has(group.module) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="font-medium capitalize">{group.module}</span>
                          <span className="text-sm text-muted-foreground">
                            ({group.permissions.length} permissions)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={
                            allSelected
                              ? 'border-indigo-200/60 bg-indigo-100/50 text-indigo-700'
                              : someSelected
                                ? 'border-yellow-200/60 bg-yellow-100/50 text-yellow-700'
                                : 'border-white/30 bg-white/20'
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllInModule(group.module);
                          }}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>

                      {expandedModules.has(group.module) && (
                        <div className="grid grid-cols-1 gap-2 p-4 pt-0 md:grid-cols-2">
                          {group.permissions.map((permission: Permission) => (
                            <label
                              key={permission.id}
                              className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-white/25"
                            >
                              <Checkbox
                                checked={formData.permissionNames.includes(permission.name)}
                                onCheckedChange={() => togglePermission(permission.name)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 space-y-0.5">
                                <span className="text-sm font-medium">{permission.name}</span>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={closeRoleModal}>
              Cancel
            </Button>
            <Button
              onClick={isCreateModalOpen ? handleCreateRole : handleUpdateRole}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="h-5 w-5" />
              {isCreateModalOpen ? 'Create Role' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Modal */}
      <Dialog
        open={isAssignModalOpen && !!selectedRole}
        onOpenChange={(open) => {
          if (!open) setIsAssignModalOpen(false);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(80vh,100dvh)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogHeader className="flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-2xl">
              Staff with Role: {selectedRole?.name}
            </DialogTitle>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" className="relative z-30 shrink-0">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <DialogBody>
            {staffList.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No staff members assigned to this role</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((staff) => (
                  <div key={staff.id} className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{staff.user.name}</h4>
                        <p className="text-sm text-muted-foreground">{staff.user.email}</p>
                        {staff.branch && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Branch: {staff.branch.name}
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${
                          staff.user.isActive
                            ? 'bg-green-100/70 text-green-700'
                            : 'bg-red-100/70 text-red-700'
                        }`}
                      >
                        {staff.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
