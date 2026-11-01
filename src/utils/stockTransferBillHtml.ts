import type { VoucherPaperFormat } from '@/components/common/VoucherFormatModal';

type Loc = {
  id?: string;
  name?: string;
  locationCode?: string;
  locationType?: string;
  address?: string;
  location?: string;
} | null | undefined;

type TransferItem = {
  id?: string;
  quantity?: number;
  requestedQuantity?: number;
  releasedQuantity?: number;
  unitCost?: number;
  unitPrice?: number;
  totalCost?: number;
  product?: {
    name?: string;
    sku?: string;
    productCode?: string;
  } | null;
};

export type StockTransferBillInput = {
  releaseNumber?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  releaseDate?: string;
  createdBy?: { name?: string } | null;
  fromLocation?: Loc;
  toLocation?: Loc;
  /** Legacy aliases still used in some UI paths */
  fromBranch?: Loc;
  toBranch?: Loc;
  items?: TransferItem[] | null;
};

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(v: number | string | null | undefined): string {
  return `Rs. ${Number(v || 0).toFixed(2)}`;
}

export function resolveTransferLocation(
  primary?: Loc,
  legacy?: Loc,
): { name: string; code: string; address: string } {
  const loc = primary || legacy || null;
  return {
    name: loc?.name || 'Unknown location',
    code: loc?.locationCode || '',
    address: loc?.address || loc?.location || '',
  };
}

/** Printable stock-transfer bill with From → To and line items. */
export function buildStockTransferBillHtml(
  transfer: StockTransferBillInput,
  format: VoucherPaperFormat = '80mm',
  business?: { name?: string | null; telephone?: string | null; address?: string | null; city?: string | null },
): string {
  const from = resolveTransferLocation(transfer.fromLocation, transfer.fromBranch);
  const to = resolveTransferLocation(transfer.toLocation, transfer.toBranch);
  const items = Array.isArray(transfer.items) ? transfer.items : [];
  const bizName = (business?.name || 'ORGANIZATION').toUpperCase();
  const addr = [business?.address, business?.city].filter(Boolean).join(', ');
  const when = transfer.releaseDate || transfer.createdAt || new Date().toISOString();
  const whenLabel = (() => {
    const d = new Date(when);
    return Number.isNaN(d.getTime()) ? String(when) : d.toLocaleString();
  })();

  const lineRows = items.map((item, i) => {
    const qty = Number(
      item.releasedQuantity ?? item.quantity ?? item.requestedQuantity ?? 0,
    );
    const unit = Number(item.unitCost ?? item.unitPrice ?? 0);
    const total = Number(item.totalCost ?? unit * qty);
    const name = item.product?.name || 'Product';
    const code = item.product?.productCode || item.product?.sku || '';
    return { i: i + 1, name, code, qty, unit, total };
  });
  const totalQty = lineRows.reduce((s, r) => s + r.qty, 0);
  const totalCost = lineRows.reduce((s, r) => s + r.total, 0);

  if (format === 'a4') {
    const rows = lineRows
      .map(
        (r) => `<tr>
        <td>${r.i}</td>
        <td><div style="font-weight:700">${esc(r.name)}</div>${r.code ? `<div style="font-size:10px;color:#555">${esc(r.code)}</div>` : ''}</td>
        <td class="c">${r.qty}</td>
        <td class="r">${money(r.unit)}</td>
        <td class="r">${money(r.total)}</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Stock Transfer Bill</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color:#111; font-size:12px; margin:0; }
  .biz { font-size:18px; font-weight:800; margin:0 0 4px; }
  .muted { color:#555; font-size:11px; line-height:1.4; }
  h1 { font-size:20px; margin:12px 0 4px; letter-spacing:0.04em; }
  .route { display:flex; gap:16px; margin:14px 0; }
  .box { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:12px; background:#f8fafc; }
  .box h3 { margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:#64748b; }
  .box .name { font-size:15px; font-weight:700; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th, td { border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:left; vertical-align:top; }
  th { background:#f8fafc; font-size:10px; text-transform:uppercase; }
  .c { text-align:center; } .r { text-align:right; }
  .footer { margin-top:18px; text-align:center; color:#666; font-size:10px; }
</style></head><body>
  <div class="biz">${esc(bizName)}</div>
  ${addr ? `<div class="muted">${esc(addr)}</div>` : ''}
  ${business?.telephone ? `<div class="muted">Tel: ${esc(business.telephone)}</div>` : ''}
  <h1>STOCK TRANSFER BILL</h1>
  <div class="muted">Transfer #: ${esc(transfer.releaseNumber || '-')}</div>
  <div class="muted">Status: ${esc((transfer.status || '-').replace(/_/g, ' '))}</div>
  <div class="muted">Date: ${esc(whenLabel)}</div>
  ${transfer.createdBy?.name ? `<div class="muted">Created by: ${esc(transfer.createdBy.name)}</div>` : ''}
  <div class="route">
    <div class="box">
      <h3>From</h3>
      <div class="name">${esc(from.name)}</div>
      ${from.code ? `<div class="muted">${esc(from.code)}</div>` : ''}
      ${from.address ? `<div class="muted">${esc(from.address)}</div>` : ''}
    </div>
    <div class="box">
      <h3>To</h3>
      <div class="name">${esc(to.name)}</div>
      ${to.code ? `<div class="muted">${esc(to.code)}</div>` : ''}
      ${to.address ? `<div class="muted">${esc(to.address)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Product</th><th class="c">Qty</th><th class="r">Unit cost</th><th class="r">Total</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No items</td></tr>'}</tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="font-weight:700">Total</td>
        <td class="c" style="font-weight:700">${totalQty}</td>
        <td></td>
        <td class="r" style="font-weight:700">${money(totalCost)}</td>
      </tr>
    </tfoot>
  </table>
  ${transfer.notes ? `<div style="margin-top:12px"><strong>Notes:</strong> ${esc(transfer.notes)}</div>` : ''}
  <div class="footer">Printed ${esc(new Date().toLocaleString())} · Stock Transfer</div>
</body></html>`;
  }

  const width = format === '54mm' ? '54mm' : '80mm';
  const fs = format === '54mm' ? '9px' : '11px';
  const itemBlock = lineRows
    .map(
      (r) => `<div style="margin:5px 0;border-bottom:1px dashed #ccc;padding-bottom:5px">
      <div style="font-weight:700">${esc(r.name)}</div>
      ${r.code ? `<div style="color:#555">${esc(r.code)}</div>` : ''}
      <div style="display:flex;justify-content:space-between"><span>Qty ${r.qty}</span><span>${money(r.total)}</span></div>
    </div>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Stock Transfer Bill</title>
<style>
  @page { size: ${width} auto; margin: 0; }
  body { width:${width}; max-width:${width}; margin:0; padding:3mm; font-family:'Segoe UI',Arial,sans-serif; font-size:${fs}; color:#111; }
  .c { text-align:center; } .biz { font-weight:800; font-size:13px; }
</style></head><body>
  <div class="c">
    <div class="biz">${esc(bizName)}</div>
    ${addr ? `<div style="color:#555">${esc(addr)}</div>` : ''}
  </div>
  <hr style="border:none;border-top:1px dashed #999;margin:6px 0"/>
  <div class="c"><strong>STOCK TRANSFER BILL</strong></div>
  <div class="c">${esc(transfer.releaseNumber || '-')}</div>
  <div class="c" style="color:#666">${esc(whenLabel)}</div>
  <hr style="border:none;border-top:1px dashed #999;margin:6px 0"/>
  <div><strong>From:</strong> ${esc(from.name)}${from.code ? ` (${esc(from.code)})` : ''}</div>
  <div><strong>To:</strong> ${esc(to.name)}${to.code ? ` (${esc(to.code)})` : ''}</div>
  <div style="color:#666;margin:4px 0">${esc((transfer.status || '').replace(/_/g, ' '))}</div>
  <hr style="border:none;border-top:1px dashed #999;margin:6px 0"/>
  ${itemBlock || '<div>No items</div>'}
  <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:6px">
    <span>Total qty ${totalQty}</span><span>${money(totalCost)}</span>
  </div>
  ${transfer.notes ? `<div style="margin-top:6px;font-style:italic;color:#555">${esc(transfer.notes)}</div>` : ''}
  <div class="c" style="margin-top:8px;color:#666">Stock Transfer</div>
</body></html>`;
}
