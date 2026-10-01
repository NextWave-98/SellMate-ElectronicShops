/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Camera, Loader2, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useAiVision, {
  type ExtractedLine,
  type LineMatch,
  type MatchCandidate,
  AI_POS_PREFILL_KEY,
} from '../../hooks/useAiVision';
import type { HeldCartSnapshot } from '../../hooks/usePosHeldCart';

export type AiListScanMode = 'pos' | 'invoices';

export interface ConfirmedAiLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  sku?: string | null;
  brand?: string | null;
}

interface AiListScanModalProps {
  open: boolean;
  onClose: () => void;
  mode: AiListScanMode;
  /** Called after user confirms (Invoices mode fills quote; POS may still navigate) */
  onConfirmLines?: (lines: ConfirmedAiLine[]) => void;
  /** POS: navigate after writing sessionStorage prefill */
  onSendToPos?: () => void;
  /** POS: create quotation from confirmed lines via parent */
  onCreatePosQuote?: (lines: ConfirmedAiLine[], snapshot: HeldCartSnapshot) => void;
}

type ReviewRow = {
  extracted: ExtractedLine;
  match: LineMatch;
  removed: boolean;
  rematchQuery: string;
};

function statusBadge(status: LineMatch['status']) {
  if (status === 'exact') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'similar') return 'bg-amber-50 text-amber-800 border-amber-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

export default function AiListScanModal({
  open,
  onClose,
  mode,
  onConfirmLines,
  onSendToPos,
  onCreatePosQuote,
}: AiListScanModalProps) {
  const { analyzeList, rematchLine, loading } = useAiVision();
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busyRematch, setBusyRematch] = useState<number | null>(null);

  const activeRows = useMemo(() => rows.filter((r) => !r.removed), [rows]);
  const confirmed = useMemo((): ConfirmedAiLine[] => {
    const out: ConfirmedAiLine[] = [];
    for (const r of activeRows) {
      const id = r.match.selectedProductId;
      if (!id) continue;
      const cand =
        r.match.candidates.find((c) => c.productId === id) ||
        ({
          productId: id,
          name: r.extracted.name,
          unitPrice: 0,
        } as MatchCandidate);
      out.push({
        productId: cand.productId,
        name: cand.name,
        unitPrice: Number(cand.unitPrice) || 0,
        quantity: Math.max(1, Number(r.extracted.qty) || 1),
        sku: cand.sku,
        brand: cand.brand,
      });
    }
    return out;
  }, [activeRows]);

  if (!open) return null;

  const reset = () => {
    setStep('upload');
    setRows([]);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    try {
      const result = await analyzeList(file);
      const next: ReviewRow[] = result.extracted.map((extracted, i) => {
        const match =
          result.matches.find((m) => m.lineIndex === i) ||
          ({
            lineIndex: i,
            status: 'unmatched' as const,
            selectedProductId: null,
            candidates: [],
          } satisfies LineMatch);
        return {
          extracted,
          match,
          removed: false,
          rematchQuery: extracted.name,
        };
      });
      setRows(next);
      setStep('review');
      toast.success(`Found ${next.length} line(s)`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI analysis failed');
    }
  };

  const selectCandidate = (idx: number, productId: string) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              match: {
                ...r.match,
                selectedProductId: productId || null,
                status: productId ? 'similar' : 'unmatched',
              },
            }
          : r,
      ),
    );
  };

  const doRematch = async (idx: number) => {
    const row = rows[idx];
    if (!row?.rematchQuery.trim()) return;
    setBusyRematch(idx);
    try {
      const match = await rematchLine({
        lineIndex: idx,
        query: row.rematchQuery.trim(),
        brand: row.extracted.brand,
        barcode: row.extracted.barcode,
      });
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, match } : r)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rematch failed');
    } finally {
      setBusyRematch(null);
    }
  };

  const buildSnapshot = (lines: ConfirmedAiLine[]): HeldCartSnapshot => ({
    cart: lines.map((l) => ({
      id: l.productId,
      productId: l.productId,
      name: l.name,
      price: l.unitPrice,
      quantity: l.quantity,
      stock: 9999,
      category: '',
    })),
  });

  const handleAddToCart = () => {
    if (!confirmed.length) {
      toast.error('Select at least one matched product');
      return;
    }
    const snapshot = buildSnapshot(confirmed);
    try {
      sessionStorage.setItem(
        AI_POS_PREFILL_KEY,
        JSON.stringify({ savedAt: Date.now(), snapshot }),
      );
    } catch {
      /* ignore */
    }
    onConfirmLines?.(confirmed);
    onSendToPos?.();
    handleClose();
  };

  const handleCreateQuote = () => {
    if (!confirmed.length) {
      toast.error('Select at least one matched product');
      return;
    }
    if (mode === 'pos') {
      onCreatePosQuote?.(confirmed, buildSnapshot(confirmed));
    } else {
      onConfirmLines?.(confirmed);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scan product list</h2>
            <p className="text-xs text-gray-500">
              Upload a bill or list photo — AI matches your catalog products
            </p>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {step === 'upload' && (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40">
              {loading ? (
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              ) : (
                <Camera className="w-10 h-10 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {loading ? 'Analyzing image…' : 'Click to upload list / bill photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={loading}
                onChange={(e) => void onFile(e.target.files?.[0] || null)}
              />
            </label>
          )}

          {step === 'review' && (
            <>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Uploaded list"
                  className="max-h-40 rounded-lg border object-contain mx-auto"
                />
              )}
              <div className="space-y-3">
                {rows.map((row, idx) => {
                  if (row.removed) return null;
                  return (
                    <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {row.extracted.name}
                            {row.extracted.brand ? (
                              <span className="text-gray-500 font-normal"> · {row.extracted.brand}</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-gray-500">Qty: {row.extracted.qty}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusBadge(row.match.status)}`}
                          >
                            {row.match.status}
                          </span>
                          <button
                            type="button"
                            title="Remove line"
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, removed: true } : r)),
                              )
                            }
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <select
                        className="w-full border rounded-md px-2 py-1.5 text-sm bg-white"
                        value={row.match.selectedProductId || ''}
                        onChange={(e) => selectCandidate(idx, e.target.value)}
                      >
                        <option value="">— Select product —</option>
                        {row.match.candidates.map((c) => (
                          <option key={c.productId} value={c.productId}>
                            {c.name}
                            {c.sku ? ` (${c.sku})` : ''} · {c.unitPrice} ·{' '}
                            {Math.round(c.score * 100)}%
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <input
                          className="flex-1 border rounded-md px-2 py-1.5 text-sm"
                          value={row.rematchQuery}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, rematchQuery: e.target.value } : r,
                              ),
                            )
                          }
                          placeholder="Search catalog…"
                        />
                        <button
                          type="button"
                          disabled={busyRematch === idx}
                          onClick={() => void doRematch(idx)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-white disabled:opacity-50"
                        >
                          {busyRematch === idx ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          Rematch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {step === 'review' && (
          <div className="border-t px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-white">
            <p className="text-xs text-gray-500">
              {confirmed.length} of {activeRows.length} lines selected
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                }}
                className="px-3 py-2 text-sm border rounded-md"
              >
                New photo
              </button>
              {mode === 'pos' ? (
                <>
                  <button
                    type="button"
                    onClick={handleCreateQuote}
                    className="px-3 py-2 text-sm rounded-md border border-violet-300 text-violet-700 hover:bg-violet-50"
                  >
                    Create quotation
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Add to cart
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateQuote}
                  className="px-3 py-2 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700"
                >
                  Create quotation
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
