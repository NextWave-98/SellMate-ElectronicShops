import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, Sparkles, ShieldQuestion } from 'lucide-react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyCoverageItem } from '../../../hooks/useWarranty';
import ConfirmModal from '../../common/ConfirmModal';

/**
 * The organization's own coverage vocabulary   Battery, Display, Labour, and
 * so on. This is deliberately just a list of names, not a fixed enum: what a
 * laptop shop covers and what a clothing shop covers have nothing in common,
 * and both run on this same screen.
 *
 * Nothing here is destructive to history. Renaming or deactivating an item
 * changes only the template new products build from; a card already issued
 * keeps the name it was given, forever (see the coverage service's own notes
 * on this   it's the same guarantee FIFO and invoice warranty months rely on
 * elsewhere in this app).
 */
export default function CoverageSettingsPanel() {
  const { getCoverageItems, createCoverageItem, updateCoverageItem, deleteCoverageItem, seedCoverageItems } = useWarranty();

  const hookRef = useRef({ getCoverageItems, createCoverageItem, updateCoverageItem, deleteCoverageItem, seedCoverageItems });
  hookRef.current = { getCoverageItems, createCoverageItem, updateCoverageItem, deleteCoverageItem, seedCoverageItems };

  const [items, setItems] = useState<WarrantyCoverageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await hookRef.current.getCoverageItems(true);
    if (Array.isArray(res?.data)) setItems(res!.data as WarrantyCoverageItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Give the item a name first');
      return;
    }
    setAdding(true);
    const res = await hookRef.current.createCoverageItem({
      name,
      description: newDescription.trim() || undefined,
    });
    setAdding(false);
    if (res?.data) {
      toast.success(`"${name}" added`);
      setNewName('');
      setNewDescription('');
      load();
    }
  };

  const startEdit = (item: WarrantyCoverageItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      toast.error('Name cannot be empty');
      return;
    }
    const res = await hookRef.current.updateCoverageItem(editingId, {
      name, description: editDescription.trim() || undefined,
    });
    if (res?.data) {
      toast.success('Updated');
      setEditingId(null);
      load();
    }
  };

  const toggleActive = async (item: WarrantyCoverageItem) => {
    const res = await hookRef.current.updateCoverageItem(item.id, { isActive: !item.isActive });
    if (res?.data) load();
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const res = await hookRef.current.deleteCoverageItem(id);
    if (res?.data !== undefined) {
      const affected = (res.data as { cardsAffected?: number })?.cardsAffected ?? 0;
      toast.success(
        affected > 0
          ? `Removed. ${affected} issued card(s) keep it exactly as printed.`
          : 'Removed from the list'
      );
      load();
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    const res = await hookRef.current.seedCoverageItems();
    setSeeding(false);
    if (res?.data) {
      const { created } = res.data as { created: number; skipped: number };
      toast.success(created > 0 ? `Added ${created} item(s)` : 'Nothing new to add   you already have these');
      load();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Coverage vocabulary</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            What your warranties can cover   Battery, Display, Labour, and so on.
            Tick these against a product to build a structured coverage template;
            issued cards keep their own copy forever, so renaming or removing an
            item here never changes a warranty already in a customer's hand.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          {seeding ? 'Adding…' : 'Seed suggestions for my industry'}
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Item name, e.g. Battery"
            maxLength={80}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
          <input
            type="text"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-10 text-gray-400">
          <ShieldQuestion className="w-8 h-8" />
          <p className="text-sm">No coverage items yet. Add one above, or seed a starting list for your industry.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {items.map(item => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${item.isActive ? 'bg-white' : 'bg-gray-50'}`}>
              {editingId === item.id ? (
                <>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                    />
                    <input
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="Description"
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <button onClick={saveEdit} className="p-1.5 rounded-md text-green-600 hover:bg-green-50">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-500 truncate">{item.description}</p>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={() => toggleActive(item)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
                    />
                    Active
                  </label>
                  <button onClick={() => startEdit(item)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPendingDeleteId(item.id)} className="p-1.5 rounded-md text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        title="Remove coverage item"
        message="This removes it from future product templates. Warranty cards already issued with this item keep it exactly as printed."
        confirmText="Remove"
        cancelText="Cancel"
      />
    </div>
  );
}
