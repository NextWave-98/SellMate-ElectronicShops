/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Barcode } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { useLocation as useLocations } from '../../hooks/useLocation';

const STATUS_COLOR: Record<string, string> = {
  IN_STOCK: 'bg-green-100 text-green-800',
  SOLD: 'bg-blue-100 text-blue-800',
  DEFECTIVE: 'bg-amber-100 text-amber-800',
  RETURNED_TO_SUPPLIER: 'bg-gray-200 text-gray-700',
  WRITTEN_OFF: 'bg-red-100 text-red-800',
};

/**
 * Serial / IMEI register: find any unit by serial (where is it, who bought it,
 * where it came from) and register serials for stock that was already on the
 * shelf before the product started tracking serials.
 */
export default function SerialNumbersPage() {
  const { fetchData } = useFetch();
  const { getAllLocations } = useLocations();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [reg, setReg] = useState({ productId: '', locationId: '', serials: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const res: any = await fetchData({ endpoint: `/product-serials?${params.toString()}`, method: 'GET', silent: true });
      setRows(res?.data?.serials ?? []);
    } finally {
      setLoading(false);
    }
  }, [fetchData, search, status]);

  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (serial: string) => {
    const res: any = await fetchData({ endpoint: `/product-serials/lookup/${encodeURIComponent(serial)}`, method: 'GET', silent: true });
    if (res?.data) setDetail(res.data);
  };

  const openRegister = async () => {
    setShowRegister(true);
    const [p, l]: any[] = await Promise.all([
      fetchData({ endpoint: '/products?limit=500&isActive=true', method: 'GET', silent: true }),
      getAllLocations(),
    ]);
    const plist = Array.isArray(p?.data) ? p.data : p?.data?.products ?? [];
    setProducts(plist.filter((x: any) => !x.isService && !x.isReload));
    const raw = l?.data;
    setLocations(Array.isArray(raw) ? raw : raw?.locations ?? []);
  };

  const submitRegister = async () => {
    const serialNumbers = reg.serials.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!reg.productId || !reg.locationId || !serialNumbers.length) {
      toast.error('Choose product, branch and enter serials');
      return;
    }
    const res: any = await fetchData({
      endpoint: '/product-serials',
      method: 'POST',
      data: { productId: reg.productId, locationId: reg.locationId, serialNumbers },
      successMessage: `${serialNumbers.length} serial(s) registered`,
    });
    if (res?.success) {
      setShowRegister(false);
      setReg({ productId: '', locationId: '', serials: '' });
      load();
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Barcode className="w-6 h-6" /> Serial / IMEI Register</h1>
          <p className="text-sm text-gray-500">Every unit of serial-tracked products   in stock, sold, returned</p>
        </div>
        <button onClick={openRegister} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm hover:bg-orange-700">
          <Plus className="w-4 h-4" /> Register existing stock
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Serial / IMEI" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLOR).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={load} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Search</button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Serial / IMEI</th><th className="p-3">Product</th><th className="p-3">Status</th>
              <th className="p-3">Source</th><th className="p-3">Sale</th><th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t cursor-pointer hover:bg-gray-50" onClick={() => openDetail(r.serialNumber)}>
                <td className="p-3 font-mono">{r.serialNumber}</td>
                <td className="p-3">{r.product?.name}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[r.status] || ''}`}>{r.status.replace(/_/g, ' ')}</span></td>
                <td className="p-3 text-xs">{r.sourceType || ' '} {r.sourceNumber ? `· ${r.sourceNumber}` : ''}</td>
                <td className="p-3 text-xs">{r.saleNumber || ' '}</td>
                <td className="p-3 text-xs text-gray-500">{new Date(r.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No serials found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="glass-modal-panel max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold font-mono">{detail.serialNumber}</h2>
            <p className="text-sm">{detail.product?.name} · <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[detail.status] || ''}`}>{detail.status}</span></p>
            <p className="text-sm text-gray-600">Location: {detail.location?.name || ' '} · Sale: {detail.saleNumber || ' '}</p>
            <div className="border-t pt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">History</p>
              <ul className="text-xs space-y-1">
                {(detail.history || []).map((h: any, i: number) => (
                  <li key={i}>{new Date(h.at).toLocaleString()}   {String(h.event).replace(/_/g, ' ')} {h.ref ? `(${h.ref})` : ''} {h.note ? `  ${h.note}` : ''}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end"><button onClick={() => setDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button></div>
          </div>
        </div>
      )}

      {showRegister && (
        <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowRegister(false); }}>
          <div className="glass-modal-panel max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Register serials of existing stock</h2>
            <p className="text-xs text-gray-500">For units already on the shelf before serial tracking was switched on. New stock gets its serials at GRN / receiving.</p>
            <select value={reg.productId} onChange={(e) => setReg({ ...reg, productId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Select product</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.productCode ? `(${p.productCode})` : ''}</option>)}
            </select>
            <select value={reg.locationId} onChange={(e) => setReg({ ...reg, locationId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Select branch / warehouse</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <textarea value={reg.serials} onChange={(e) => setReg({ ...reg, serials: e.target.value })} rows={6}
              placeholder="One serial / IMEI per line" className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRegister(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={submitRegister} className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm">Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
