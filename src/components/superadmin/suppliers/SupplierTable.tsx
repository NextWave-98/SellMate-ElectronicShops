import SupplierStatusBadge from './SupplierStatusBadge';
import { Building2, Edit, Trash2, Eye, Phone, Mail, Star, Plus, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Pagination from '../../common/Pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

// API Supplier type matching backend response
interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  supplierType: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  creditLimit?: number;
  creditDays?: number;
  paymentTerms?: string;
  rating?: number;
  status?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (supplier: Supplier) => void;
  onView?: (supplier: Supplier) => void;
  onAddPO?: (supplier: Supplier) => void;
  // Pagination (controlled)
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  // Selection props
  selectable?: boolean;
  selectedSuppliers?: Supplier[];
  onSelectionChange?: (suppliers: Supplier[]) => void;
}

export default function SupplierTable({ suppliers, onEdit, onDelete, onView, onAddPO, currentPage = 1, itemsPerPage = 10, totalItems = suppliers.length, onPageChange = () => {}, onItemsPerPageChange = () => {}, selectable = false, selectedSuppliers = [], onSelectionChange }: SupplierTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (supplierId: string) => {
    setOpenMenuId(openMenuId === supplierId ? null : supplierId);
  };

  const isSelected = (supplier: Supplier) => {
    return selectedSuppliers.some(selected => selected.id === supplier.id);
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    if (!onSelectionChange) return;

    if (isSelected(supplier)) {
      onSelectionChange(selectedSuppliers.filter(selected => selected.id !== supplier.id));
    } else {
      onSelectionChange([...selectedSuppliers, supplier]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedSuppliers.length === suppliers.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(suppliers);
    }
  };

  // Pagination (controlled by parent)
  const totalPages = Math.ceil((totalItems || suppliers.length) / itemsPerPage);
  const currentSuppliers = suppliers;

  const handleItemsPerPageChange = (value: number) => {
    onItemsPerPageChange(value);
    onPageChange(1);
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Building2 className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto min-h-96">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedSuppliers.length === suppliers.length && suppliers.length > 0}
                    onCheckedChange={() => handleSelectAll()}
                  />
                </TableHead>
              )}
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Credit Limit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                {selectable && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected(supplier)}
                      onCheckedChange={() => handleSelectSupplier(supplier)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.supplierCode}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-sm text-gray-900">
                      <Phone className="w-3 h-3 mr-1 text-gray-400" />
                      {supplier.phone}
                    </div>
                    {supplier.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="w-3 h-3 mr-1 text-gray-400" />
                        {supplier.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {supplier.supplierType}
                  </span>
                </TableCell>
                <TableCell>
                  {supplier.rating ? renderRating(supplier.rating) : <span className="text-gray-400">N/A</span>}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {supplier.creditLimit ? (
                      <>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(supplier.creditLimit)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {supplier.creditDays} days
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <SupplierStatusBadge status={(supplier.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING_APPROVAL'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
