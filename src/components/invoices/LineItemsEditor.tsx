import type { InvoiceLineItem } from '../../lib/invoices/types'

export default function LineItemsEditor({
  items,
  onChange,
}: {
  items: InvoiceLineItem[]
  onChange: (items: InvoiceLineItem[]) => void
}) {
  const update = (index: number, patch: Partial<InvoiceLineItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Line items</h3>
        <button
          type="button"
          className="text-sm text-orange-600"
          onClick={() => onChange([...items, { description: '', hours: 1, rate: 0 }])}
        >
          Add line
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-12 gap-2 items-center">
          <input
            className="col-span-5 border rounded-md px-2 py-1.5 text-sm"
            placeholder="Description"
            value={item.description || ''}
            onChange={(e) => update(index, { description: e.target.value })}
          />
          <input
            className="col-span-2 border rounded-md px-2 py-1.5 text-sm"
            type="number"
            placeholder="Qty"
            value={item.hours ?? item.quantity ?? 0}
            onChange={(e) => update(index, { hours: Number(e.target.value) })}
          />
          <input
            className="col-span-2 border rounded-md px-2 py-1.5 text-sm"
            type="number"
            placeholder="Rate"
            value={item.rate ?? 0}
            onChange={(e) => update(index, { rate: Number(e.target.value) })}
          />
          <label className="col-span-2 text-xs flex items-center gap-1">
            <input type="checkbox" checked={Boolean(item.monthly)} onChange={(e) => update(index, { monthly: e.target.checked })} />
            Monthly
          </label>
          <button type="button" className="col-span-1 text-red-500 text-sm" onClick={() => onChange(items.filter((_, i) => i !== index))}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
