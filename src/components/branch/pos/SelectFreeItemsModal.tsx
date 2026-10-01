import { useMemo, useState, useEffect } from 'react';
import { Gift, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type FreePickRow = {
  productId: string;
  name: string;
  stock: number;
  quantity: number;
};

interface SelectFreeItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerName: string;
  entitlement: number;
  rows: FreePickRow[];
  onApply: (rows: FreePickRow[]) => void;
}

export default function SelectFreeItemsModal({
  open,
  onOpenChange,
  offerName,
  entitlement,
  rows: initialRows,
  onApply,
}: SelectFreeItemsModalProps) {
  const [rows, setRows] = useState<FreePickRow[]>(initialRows);

  useEffect(() => {
    if (open) setRows(initialRows.map((r) => ({ ...r })));
  }, [open, initialRows]);

  const selected = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
    [rows],
  );
  const remaining = entitlement - selected;

  const setQty = (productId: string, next: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.productId !== productId) return r;
        const others = prev
          .filter((x) => x.productId !== productId)
          .reduce((s, x) => s + x.quantity, 0);
        const maxByEntitlement = Math.max(0, entitlement - others);
        const maxByStock = Math.max(0, Math.floor(Number(r.stock) || 0));
        const capped = Math.min(
          Math.max(0, Math.floor(next)),
          maxByEntitlement,
          maxByStock,
        );
        return { ...r, quantity: capped };
      }),
    );
  };

  const canApply = selected <= entitlement + 1e-9;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-600" />
            Select Free Items
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">{offerName}</p>
        <p className="text-sm font-medium">
          Eligible quantity: <span className="text-emerald-700">{entitlement}</span>
        </p>
        <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
          {rows.map((row) => {
            const others = selected - row.quantity;
            const canInc =
              others + row.quantity < entitlement &&
              row.quantity < Math.floor(Number(row.stock) || 0);
            return (
              <div
                key={row.productId}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{row.name}</div>
                  <div className="text-xs text-gray-500">Stock: {row.stock}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={row.quantity <= 0}
                    onClick={() => setQty(row.productId, row.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {row.quantity}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={!canInc}
                    onClick={() => setQty(row.productId, row.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <p
          className={`text-sm font-medium ${
            selected > entitlement ? 'text-red-600' : 'text-gray-700'
          }`}
        >
          Selected: {selected} / {entitlement}
          {remaining > 0 ? ` (${remaining} left)` : ''}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canApply}
            onClick={() => {
              onApply(rows);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
