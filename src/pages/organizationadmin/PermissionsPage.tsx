import { useEffect, useState, useCallback } from 'react';

import { Shield, Search, RefreshCw, ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react';
import { usePermissionManagement } from '../../hooks/usePermissionManagement';
import type { Permission, PermissionGroup } from '../../types/permission.types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function PermissionsPage() {
  const { getAllPermissions, groupPermissionsByModule, isLoading } = usePermissionManagement();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<PermissionGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllPermissions({ limit: 500 });
      
      if (response?.success && response.data) {
        const permissionsList = Array.isArray(response.data) 
          ? response.data 
          : (response.data as { permissions?: Permission[] }).permissions || [];
        setPermissions(permissionsList);
        const grouped = groupPermissionsByModule(permissionsList);
        setGroupedPermissions(grouped);
        // Expand all modules by default
        setExpandedModules(new Set(grouped.map(g => g.module)));
      }
    } catch (error) {
      toast.error('Failed to load permissions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [getAllPermissions, groupPermissionsByModule]);

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    await loadPermissions();
    toast.success('Permissions refreshed');
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

  const expandAll = () => {
    setExpandedModules(new Set(groupedPermissions.map(g => g.module)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  // Get unique modules for filter
  const modules = ['all', ...new Set(permissions.map(p => p.module))];

  // Filter permissions
  const filteredGroups = groupedPermissions
    .filter(group => selectedModule === 'all' || group.module === selectedModule)
    .map(group => ({
      ...group,
      permissions: group.permissions.filter(
        p =>
          searchQuery === '' ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(group => group.permissions.length > 0);

  const totalPermissions = permissions.length;
  const activePermissions = permissions.filter(p => p.isActive).length;

  const formatModuleName = (module: string) => {
    return module
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatActionName = (action: string) => {
    const actionColors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      read: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      manage: 'bg-purple-100 text-purple-800',
      export: 'bg-indigo-100 text-indigo-800',
    };
    return actionColors[action?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Permission Management
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage system permissions
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Permissions</p>
                <p className="text-xl font-bold text-gray-900">{totalPermissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Unlock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-bold text-gray-900">{activePermissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-xl font-bold text-gray-900">{totalPermissions - activePermissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Modules</p>
                <p className="text-xl font-bold text-gray-900">{groupedPermissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module === 'all' ? 'All Modules' : formatModuleName(module)}
                </option>
              ))}
            </select>

            {/* Expand/Collapse All */}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="secondary" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions List */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <Card className="text-center">
            <CardContent className="p-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No permissions found</h3>
              <p className="text-gray-500 mt-1">
                {searchQuery ? 'Try adjusting your search query' : 'No permissions available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <Card key={group.module} className="overflow-hidden">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(group.module)}
                className="w-full flex items-center justify-between px-6 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedModules.has(group.module) ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-gray-900">
                    {formatModuleName(group.module)}
                  </span>
                </div>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                  {group.permissions.length} permissions
                </Badge>
              </button>

              {/* Permissions Table */}
              {expandedModules.has(group.module) && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Permission Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {group.permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-white/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                {permission.name}
                              </code>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${formatActionName(permission.action)}`}>
                              {permission.action?.toUpperCase() || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {permission.description || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {permission.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
