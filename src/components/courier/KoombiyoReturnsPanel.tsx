import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Package, RefreshCw, ScanLine } from 'lucide-react';
import useCourier from '../../hooks/useCourier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

function extractRows(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  for (const value of Object.values(raw)) {
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
}

interface KoombiyoReturnsPanelProps {
  courierServiceId?: string;
}

export function KoombiyoReturnsPanel({ courierServiceId }: KoombiyoReturnsPanelProps) {
  const { getKoombiyoReturnNotes, getKoombiyoReturnItems, acknowledgeKoombiyoReturn } = useCourier();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [itemsByNote, setItemsByNote] = useState<Record<string, any[]>>({});
  const [itemsLoading, setItemsLoading] = useState<string | null>(null);
  const [scanWaybill, setScanWaybill] = useState('');
  const [receiving, setReceiving] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getKoombiyoReturnNotes(courierServiceId);
      setNotes(extractRows(raw));
    } catch {
      toast.error('Failed to load Koombiyo return notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [courierServiceId, getKoombiyoReturnNotes]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const noteLabel = useCallback((note: any) => {
    return String(
      note?.noteid ?? note?.noteId ?? note?.id ?? note?.note_no ?? note?.note ?? 'Return note'
    );
  }, []);

  const itemWaybill = useCallback((item: any) => {
    return String(
      item?.waybill_id ?? item?.waybillid ?? item?.orderWaybillid ?? item?.waybill ?? ''
    ).trim();
  }, []);

  const toggleNote = async (noteId: string) => {
    if (expandedNoteId === noteId) {
      setExpandedNoteId(null);
      return;
    }
    setExpandedNoteId(noteId);
    if (itemsByNote[noteId]) return;

    setItemsLoading(noteId);
    try {
      const raw = await getKoombiyoReturnItems(noteId, courierServiceId);
      setItemsByNote((prev) => ({ ...prev, [noteId]: extractRows(raw) }));
    } catch {
      toast.error('Failed to load return items');
    } finally {
      setItemsLoading(null);
    }
  };

  const handleReceive = async (waybill: string) => {
    const trimmed = waybill.trim();
    if (!trimmed) return;
    setReceiving(trimmed);
    try {
      const result = await acknowledgeKoombiyoReturn(trimmed, courierServiceId);
      if (!result) {
        toast.error('Failed to acknowledge return');
        return;
      }
      toast.success(`Return received: ${trimmed}`);
      setScanWaybill('');
      await loadNotes();
    } finally {
      setReceiving(null);
    }
  };

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => noteLabel(a).localeCompare(noteLabel(b))),
    [notes, noteLabel]
  );

  return (
    <Card className="p-4 space-y-4 border-orange-200 bg-orange-50/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-orange-900 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Koombiyo Returns
          </h3>
          <p className="text-xs text-orange-800 mt-1">
            Pull return notes from Koombiyo and mark waybills as received.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadNotes()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={scanWaybill}
          onChange={(e) => setScanWaybill(e.target.value)}
          placeholder="Scan or type waybill to receive"
          className="bg-white"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleReceive(scanWaybill);
            }
          }}
        />
        <Button
          type="button"
          onClick={() => void handleReceive(scanWaybill)}
          disabled={!scanWaybill.trim() || !!receiving}
          className="shrink-0 bg-orange-600 hover:bg-orange-700"
        >
          <ScanLine className="w-4 h-4" />
          Receive
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading return notes...</p>
      ) : sortedNotes.length === 0 ? (
        <p className="text-sm text-gray-600">No return notes found.</p>
      ) : (
        <div className="space-y-2">
          {sortedNotes.map((note) => {
            const noteId = noteLabel(note);
            const expanded = expandedNoteId === noteId;
            const items = itemsByNote[noteId] || [];
            return (
              <div key={noteId} className="rounded-lg border border-orange-200 bg-white overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm font-medium text-gray-800 hover:bg-orange-50"
                  onClick={() => void toggleNote(noteId)}
                >
                  Return note #{noteId}
                </button>
                {expanded && (
                  <div className="border-t border-orange-100 px-3 py-2 space-y-2">
                    {itemsLoading === noteId ? (
                      <p className="text-xs text-gray-500">Loading items...</p>
                    ) : items.length === 0 ? (
                      <p className="text-xs text-gray-500">No items on this note.</p>
                    ) : (
                      items.map((item, idx) => {
                        const waybill = itemWaybill(item);
                        return (
                          <div key={`${noteId}-${waybill || idx}`} className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-mono text-gray-700">{waybill || ' '}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!waybill || receiving === waybill}
                              onClick={() => void handleReceive(waybill)}
                            >
                              Mark received
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
