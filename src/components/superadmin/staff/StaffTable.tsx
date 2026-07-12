import type { Staff } from '../../../types/staff.types';
import StaffStatusBadge from './StaffStatusBadge';
import StaffRoleBadge from './StaffRoleBadge';
import { User, Phone, Mail, MapPin } from 'lucide-react';
import Pagination from '../../common/Pagination';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StaffTableProps {
  staff: Staff[];
  onEdit?: (staff: Staff) => void;
  onDelete?: (staff: Staff) => void;
  onView?: (staff: Staff) => void;
  onAssignBranch?: (staff: Staff) => void;
  onActivate?: (staff: Staff) => void;
  onDeactivate?: (staff: Staff) => void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  // Selection props
  selectable?: boolean;
  selectedStaff?: Staff[];
  onSelectionChange?: (staff: Staff[]) => void;
}

export default function StaffTable({
  staff,
  onView,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  onPageChange,
  onItemsPerPageChange,
  selectable = false,
  selectedStaff = [],
  onSelectionChange,
}: StaffTableProps) {
  const isSelected = (member: Staff) => {
    return selectedStaff.some(selected => selected.id === member.id);
  };

  const handleSelectStaff = (member: Staff) => {
    if (!onSelectionChange) return;

    if (isSelected(member)) {
      onSelectionChange(selectedStaff.filter(selected => selected.id !== member.id));
    } else {
      onSelectionChange([...selectedStaff, member]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedStaff.length === staff.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(staff);
    }
  };

  if (staff.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <User className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff found</h3>
        <p className="text-gray-600">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedStaff.length === staff.length && staff.length > 0}
                  onCheckedChange={() => handleSelectAll()}
                />
              </TableHead>
            )}
            <TableHead>Staff Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Shop/Branch</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow
              key={member.id}
              className="cursor-pointer"
              onClick={() => onView?.(member)}
            >
              {selectable && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected(member)}
                    onCheckedChange={() => handleSelectStaff(member)}
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{member.firstName} {member.lastName}</div>
                    <div className="text-xs text-gray-500">{member.employeeId}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell><StaffRoleBadge role={member.role} /></TableCell>
              <TableCell>
                <div className="text-gray-900">{member.location?.name || 'Not Assigned'}</div>
                <div className="text-xs text-gray-500 flex items-center mt-1">
                  <MapPin className="w-3 h-3 mr-1" />{member.location?.locationCode || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-gray-900">
                  <Mail className="w-3 h-3 text-gray-400" />{member.email}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Phone className="w-3 h-3 text-gray-400" />{member.phone}
                </div>
              </TableCell>
              <TableCell><StaffStatusBadge status={member.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls (shared) */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    </div>
  );
}
