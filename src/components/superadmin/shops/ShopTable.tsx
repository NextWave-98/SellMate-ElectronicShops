import type { Shop, BranchResponse } from '../../../types/shop.types';
import type { Location } from '../../../types/location.types';
import ShopStatusBadge from './ShopStatusBadge';
import { MapPin, Phone, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';
import Pagination from '../../common/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';

type ShopOrLocation = Shop | Location;

interface ShopTableProps {
  shops: ShopOrLocation[];
  onEdit?: (shop: ShopOrLocation) => void;
  onDelete?: (shop: ShopOrLocation) => void;
  onView?: (shop: ShopOrLocation) => void;
  // Server-side pagination props (optional)
  pagination?: BranchResponse['pagination'];
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  // Selection props
  selectable?: boolean;
  selectedShops?: ShopOrLocation[];
  onSelectionChange?: (shops: ShopOrLocation[]) => void;
}

// Helper to get code from Shop or Location
const getShopCode = (shop: ShopOrLocation): string => {
  return 'locationCode' in shop ? shop.locationCode : shop.code;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ShopTable({ shops, onEdit: _onEdit, onDelete: _onDelete, onView: _onView, pagination, onPageChange, onLimitChange, selectable = false, selectedShops = [], onSelectionChange }: ShopTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Decide whether to use server-side pagination
  const useServerPagination = Boolean(pagination && onPageChange && onLimitChange);

  // Calculate pagination
  const totalItems = useServerPagination ? pagination!.total : shops.length;
  const totalPages = useServerPagination ? Math.max(1, pagination!.totalPages) : Math.ceil(totalItems / itemsPerPage);
  const serverPage = useServerPagination ? pagination!.page : currentPage;
  const serverLimit = useServerPagination ? pagination!.limit : itemsPerPage;
  const startIndex = (serverPage - 1) * serverLimit;
  const endIndex = startIndex + (useServerPagination ? shops.length : serverLimit);
  const paginatedShops = useServerPagination ? shops : shops.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (value: number) => {
    if (useServerPagination) {
      onLimitChange?.(value);
      // server resets page to 1 in parent
      return;
    }

    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const toggleExpanded = (shopId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(shopId)) {
      newExpanded.delete(shopId);
    } else {
      newExpanded.add(shopId);
    }
    setExpandedRows(newExpanded);
  };

  const isSelected = (shop: ShopOrLocation) => {
    return selectedShops.some(selected => selected.id === shop.id);
  };

  const handleSelectShop = (shop: ShopOrLocation) => {
    if (!onSelectionChange) return;

    if (isSelected(shop)) {
      onSelectionChange(selectedShops.filter(selected => selected.id !== shop.id));
    } else {
      onSelectionChange([...selectedShops, shop]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedShops.length === paginatedShops.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(paginatedShops);
    }
  };

  if (shops.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <MapPin className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No shops found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedShops.length === paginatedShops.length && paginatedShops.length > 0}
                  onCheckedChange={() => handleSelectAll()}
                />
              </TableHead>
            )}
            <TableHead className="w-10">Expand</TableHead>
            <TableHead>Branch Details</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedShops.map((shop) => {
            const isExpanded = expandedRows.has(shop.id);
            const users = (shop as Location).users || [];
            return (
              <>
                <TableRow key={shop.id}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected(shop)}
                        onCheckedChange={() => handleSelectShop(shop)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(shop.id)}
                      className="p-1"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{shop.name}</div>
                        <div className="text-xs text-gray-500">{getShopCode(shop)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-900">{shop.address || 'N/A'}</div>
                    {shop.phone ? (
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <Phone className="w-3 h-3 mr-1" />{shop.phone}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">N/A</div>
                    )}
                    {shop.email && <div className="text-xs text-gray-500 mt-1">{shop.email}</div>}
                  </TableCell>
                  <TableCell><ShopStatusBadge status={shop.isActive} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{users.length}</span>
                      <span className="text-gray-500 text-xs">users</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-900">{new Date(shop.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">{new Date(shop.createdAt).toLocaleTimeString()}</div>
                  </TableCell>
                </TableRow>

                {isExpanded && users.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={selectable ? 7 : 6} className="bg-gray-50 p-4">
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Assigned Users ({users.length})
                          </h4>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Last Login</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium text-gray-900">{user.name || 'N/A'}</TableCell>
                                <TableCell className="text-gray-500">{user.email || 'N/A'}</TableCell>
                                <TableCell>{user.role?.name || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-500">
                                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {isExpanded && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={selectable ? 7 : 6} className="bg-gray-50">
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No users assigned to this location</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>

      <Pagination
        currentPage={useServerPagination ? serverPage : currentPage}
        totalPages={totalPages}
        itemsPerPage={useServerPagination ? serverLimit : itemsPerPage}
        totalItems={totalItems}
        onPageChange={(page) => {
          if (useServerPagination) onPageChange?.(page);
          else setCurrentPage(page);
        }}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </Card>
  );
}
