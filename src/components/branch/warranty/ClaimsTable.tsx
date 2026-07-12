import type { WarrantyClaim } from '../../../types/warranty.types';
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
import { getClaimStatusBadgeClass, getClaimStatusLabel } from '../../../utils/warrantyClaimStatus';
import { formatCurrency } from '../../../utils/currency';

interface ClaimsTableProps {
  claims: WarrantyClaim[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function ClaimsTable({
  claims,
  selectedIds,
  onSelectionChange,
}: ClaimsTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(claims.map((c) => c.id));
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

  const allSelected = claims.length > 0 && selectedIds.length === claims.length;

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
            <TableHead>Claim #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => {
            const isSelected = selectedIds.includes(claim.id);
            return (
              <TableRow
                key={claim.id}
                className={isSelected ? 'bg-orange-50' : ''}
                onClick={() => handleSelectOne(claim.id, !isSelected)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOne(claim.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-900">{claim.claimNumber}</TableCell>
                <TableCell>{claim.customerName}</TableCell>
                <TableCell>{claim.productName}</TableCell>
                <TableCell className="text-gray-600">{claim.issueDescription}</TableCell>
                <TableCell>
                  <Badge className={getClaimStatusBadgeClass(claim.status)}>
                    {getClaimStatusLabel(claim.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatCurrency(claim.actualCost || claim.estimatedCost || 0, { decimals: 0 })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
