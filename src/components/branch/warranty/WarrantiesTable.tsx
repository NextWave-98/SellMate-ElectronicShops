import type { Warranty } from '../../../types/warranty.types';
import { formatDateTime } from '../../../utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface WarrantiesTableProps {
  warranties: Warranty[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function WarrantiesTable({
  warranties,
  selectedIds,
  onSelectionChange,
}: WarrantiesTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(warranties.map((w) => w.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const allSelected = warranties.length > 0 && selectedIds.length === warranties.length;

  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-gray-50">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Warranty #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warranties.map((warranty) => {
            const isSelected = selectedIds.includes(warranty.id);
            return (
              <TableRow
                key={warranty.id}
                className={isSelected ? 'bg-orange-50' : ''}
                onClick={() => handleSelectOne(warranty.id, !isSelected)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOne(warranty.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-900">{warranty.warrantyNumber}</TableCell>
                <TableCell>{warranty.customerName}</TableCell>
                <TableCell>{warranty.productName}</TableCell>
                <TableCell>
                  <Badge className="bg-orange-100 text-orange-700">{warranty.warrantyType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={warranty.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {warranty.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(warranty.endDate)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
