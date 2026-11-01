import { calcInvoiceTotals, buildTotalsDisplayLines } from '../../lib/invoices/invoice-totals'
import type { InvoiceDocument } from '../../lib/invoices/types'

export default function InvoicePreviewPanel({ inv }: { inv: InvoiceDocument }) {
  const totals = calcInvoiceTotals({
    items: inv.items || [],
    discount: inv.discount,
    taxRate: inv.taxRate,
    taxIncluded: inv.taxIncluded,
    depositPaid: inv.depositPaid,
  })
  const lines = buildTotalsDisplayLines(totals, {
    taxIncluded: inv.taxIncluded,
    taxRate: Number(inv.taxRate),
    taxLabel: inv.taxLabel,
  })

  return (
    <div className="bg-white shadow-sm border rounded-lg p-6 min-h-[640px] relative overflow-hidden">
      {inv.draftWatermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 text-6xl font-bold rotate-[-28deg] text-red-600">
          DRAFT
        </div>
      )}
      <div className="flex justify-between gap-4">
        <div>
          <div className="font-semibold">{inv.companyName || 'Your company'}</div>
          <div className="text-sm text-gray-600 whitespace-pre-line">{inv.companyAddress}</div>
          <div className="text-sm text-gray-600">{inv.companyPhone}</div>
          <div className="text-sm text-gray-600">{inv.companyEmail}</div>
          {inv.companyTaxId && <div className="text-sm text-gray-600">{inv.taxLabel || 'Tax ID'}: {inv.companyTaxId}</div>}
        </div>
        {inv.logoUrl && <img src={inv.logoUrl} alt="" className="h-16 object-contain" />}
      </div>
      <h2 className="text-2xl font-bold text-orange-600 mt-6">{inv.type === 'quote' ? 'Quotation' : 'Tax Invoice'}</h2>
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div>
          <div className="text-gray-500">Bill to</div>
          <div className="font-medium">{inv.clientName || '-'}</div>
          <div>{inv.clientCompany}</div>
          <div>{inv.clientAddress}</div>
        </div>
        <div>
          <div>{inv.type === 'quote' ? 'Quote' : 'Invoice'} no. {inv.number}</div>
          <div>Date {inv.date}</div>
          {inv.dueDate && <div>Due {inv.dueDate}</div>}
        </div>
      </div>
      <table className="w-full mt-6 text-sm">
        <thead>
          <tr className="bg-orange-50 text-left">
            <th className="p-2">Description</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Rate</th>
            <th className="p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((item, i) => {
            const qty = Number(item.hours ?? item.quantity ?? 0)
            const rate = Number(item.rate || 0)
            return (
              <tr key={i} className="border-b">
                <td className="p-2">{item.description}</td>
                <td className="p-2">{qty}</td>
                <td className="p-2">{rate.toFixed(2)}</td>
                <td className="p-2 text-right">{item.monthly ? 'Monthly' : (qty * rate).toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
        {lines.map((line) => (
          <div key={line.label} className={`flex justify-between ${line.bold ? 'font-semibold' : ''}`}>
            <span>{line.label}</span>
            <span>{line.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
