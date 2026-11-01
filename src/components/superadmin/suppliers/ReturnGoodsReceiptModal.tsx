import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import type { GoodsReceipt } from '../../../hooks/useGoodsReceipt';
import { useGoodsReceipt } from '../../../hooks/useGoodsReceipt';

interface ReturnGoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goodsReceipt: GoodsReceipt | null;
}

export default function ReturnGoodsReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  goodsReceipt,
}: ReturnGoodsReceiptModalProps) {
  const { returnFromGrn, getGoodsReceiptById } = useGoodsReceipt();
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState<GoodsReceipt | null>(null);
  const [notes, setNotes] = useState('');
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !goodsReceipt?.id) {
      setDetail(null);
      setQtyByItem({});
      setNotes('');
      return;
    }
    setLoadingDetail(true);
    getGoodsReceiptById(goodsReceipt.id)
      .then((res: any) => {
        const data = (res?.data as GoodsReceipt) || goodsReceipt;
        setDetail(data);
        const initial: Record<string, string> = {};
        (data.items || []).forEach((item: any) => {
          const accepted = Number(item.acceptedQuantity || 0);
          const returned = Number(item.returnedQuantity || 0);
          const max = Math.max(0, accepted - returned);
          initial[item.id] = max > 0 ? String(max) : '0';
        });
        setQtyByItem(initial);
      })
      .catch(() => {
        setDetail(goodsReceipt);
      })
      .finally(() => setLoadingDetail(false));
  }, [isOpen, goodsReceipt, getGoodsReceiptById]);

  const lines = useMemo(() => detail?.items || [], [detail]);

  if (!isOpen || !goodsReceipt) return null;

  const handleSubmit = async () => {
    if (!detail) return;
    const items = lines
      .map((item: any) => ({
        goodsReceiptItemId: item.id,
        quantity: Number(qtyByItem[item.id] || 0),
      }))
      .filter((i) => i.quantity > 0);

    if (!items.length) {
      toast.error('Enter at least one return quantity');
      return;
    }

    setLoading(true);
    try {
      const res = await returnFromGrn(detail.id, {
        notes: notes || undefined,
        reason: 'OTHER',
        items,
      });
      if (res?.success === false) {
        toast.error((res as any)?.message || 'Return failed');
        return;
      }
      toast.success('Items returned to supplier');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to return items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Return to Supplier</h2>
              <p className="text-xs text-gray-500">{goodsReceipt.receiptNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loadingDetail ? (
            <p className="text-sm text-gray-500">Loading GRN lines…</p>
          ) : (
            <div className="space-y-3">
              {lines.map((item: any) => {
                const accepted = Number(item.acceptedQuantity || 0);
                const returned = Number(item.returnedQuantity || 0);
                const max = Math.max(0, accepted - returned);
                return (
                  <div key={item.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {item.product?.name || item.productId}
                      </p>
                      <p className="text-xs text-gray-500">
                        Accepted {accepted} · Already returned {returned} · Max {max}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={max}
                      step="0.001"
                      disabled={max <= 0}
                      value={qtyByItem[item.id] ?? '0'}
                      onChange={(e) =>
                        setQtyByItem((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="w-28 rounded border border-gray-200 px-2 py-1.5 text-sm text-right"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Reason for return…"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={handleSubmit}
            disabled={loading || loadingDetail}
          >
            {loading ? 'Returning…' : 'Confirm Return'}
          </Button>
        </div>
      </div>
    </div>
  );
}
