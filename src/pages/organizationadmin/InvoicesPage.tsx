/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import useFetch from '../../hooks/useFetch'
import LineItemsEditor from '../../components/invoices/LineItemsEditor'
import InvoicePreviewPanel from '../../components/invoices/InvoicePreviewPanel'
import PhotoUploadInput from '../../components/common/PhotoUploadInput'
import AiListScanModal, { type ConfirmedAiLine } from '../../components/common/AiListScanModal'
import { downloadInvoicePdf, invoicePdfBase64 } from '../../lib/invoices/invoice-pdf'
import type { InvoiceDocument, InvoiceStatus } from '../../lib/invoices/types'
import { calcInvoiceTotals } from '../../lib/invoices/invoice-totals'

type OrgInvoiceDefaults = {
  companyName?: string
  companyTaxId?: string | null
  companyEmail?: string | null
  companyPhone?: string | null
  companyAddress?: string | null
  companyWebsite?: string | null
  logoUrl?: string | null
}

function emptyDoc(partial: Partial<InvoiceDocument> = {}): InvoiceDocument {
  return {
    type: 'invoice',
    number: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    items: [{ description: '', hours: 1, rate: 0 }],
    scopeSections: [],
    taxRate: 0,
    taxLabel: 'VAT',
    taxIncluded: false,
    discount: 0,
    depositPaid: 0,
    monthlyPayment: false,
    status: 'draft',
    draftWatermark: true,
    bankDetails: {},
    paymentLinks: {},
    ...partial,
  }
}

export default function InvoicesPage() {
  const { fetchData } = useFetch('/invoices')
  const { fetchData: fetchCustomers } = useFetch('/customers')
  const [list, setList] = useState<InvoiceDocument[]>([])
  const [doc, setDoc] = useState<InvoiceDocument | null>(null)
  const [orgDefaults, setOrgDefaults] = useState<OrgInvoiceDefaults>({})
  const [filter, setFilter] = useState<'all' | 'invoice' | 'quote'>('all')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [showAiListScan, setShowAiListScan] = useState(false)

  const loadList = async () => {
    const res = await fetchData({
      method: 'GET',
      endpoint: `/invoices${filter === 'all' ? '' : `?type=${filter}`}${search ? `${filter === 'all' ? '?' : '&'}search=${encodeURIComponent(search)}` : ''}`,
      silent: true,
    })
    if (res?.success) setList(res.data || [])
  }

  useEffect(() => {
    loadList()
  }, [filter])

  const patch = (next: Partial<InvoiceDocument>) => {
    setDoc((prev) => (prev ? { ...prev, ...next } : prev))
  }

  const loadOrgDefaults = async () => {
    const defaults = await fetchData({ method: 'GET', endpoint: '/invoices/defaults', silent: true })
    const d = defaults?.data || {}
    const snap: OrgInvoiceDefaults = {
      companyName: d.companyName,
      companyTaxId: d.companyTaxId,
      companyEmail: d.companyEmail,
      companyPhone: d.companyPhone,
      companyAddress: d.companyAddress,
      companyWebsite: d.companyWebsite,
      logoUrl: d.logoUrl,
    }
    setOrgDefaults(snap)
    return { d, snap }
  }

  const startNew = async (type: 'invoice' | 'quote') => {
    const { d, snap } = await loadOrgDefaults()
    setDoc(emptyDoc({
      type,
      number: type === 'quote' ? d.quoteNumber : d.invoiceNumber,
      companyName: snap.companyName,
      companyTaxId: snap.companyTaxId,
      companyEmail: snap.companyEmail,
      companyPhone: snap.companyPhone,
      companyAddress: snap.companyAddress,
      companyWebsite: snap.companyWebsite,
      logoUrl: snap.logoUrl,
      taxRate: Number(d.taxRate || 0),
      taxLabel: d.taxLabel || 'VAT',
      taxIncluded: Boolean(d.taxIncluded),
      bankDetails: d.bankDetails || {},
      paymentLinks: d.paymentLinks || {},
      currency: d.currency || 'lkr',
      hasStripe: Boolean(d.hasStripe),
    }))
  }

  const startQuoteFromAiLines = async (lines: ConfirmedAiLine[]) => {
    const { d, snap } = await loadOrgDefaults()
    setDoc(emptyDoc({
      type: 'quote',
      number: d.quoteNumber,
      companyName: snap.companyName,
      companyTaxId: snap.companyTaxId,
      companyEmail: snap.companyEmail,
      companyPhone: snap.companyPhone,
      companyAddress: snap.companyAddress,
      companyWebsite: snap.companyWebsite,
      logoUrl: snap.logoUrl,
      taxRate: Number(d.taxRate || 0),
      taxLabel: d.taxLabel || 'VAT',
      taxIncluded: Boolean(d.taxIncluded),
      bankDetails: d.bankDetails || {},
      paymentLinks: d.paymentLinks || {},
      currency: d.currency || 'lkr',
      hasStripe: Boolean(d.hasStripe),
      items: lines.map((l) => ({
        description: l.name,
        hours: l.quantity,
        rate: l.unitPrice,
      })),
    }))
    toast.success(`Quote draft with ${lines.length} line(s) from AI scan`)
  }

  const openExisting = async (id: string) => {
    await loadOrgDefaults()
    const res = await fetchData({ method: 'GET', endpoint: `/invoices/${id}`, silent: true })
    if (res?.success) setDoc(res.data)
  }

  const save = async () => {
    if (!doc) return
    setSaving(true)
    try {
      const isNew = !doc.id
      const payload = {
        ...doc,
        logoUrl: (doc.logoUrl && String(doc.logoUrl).trim()) || orgDefaults.logoUrl || null,
        companyAddress: (doc.companyAddress && String(doc.companyAddress).trim()) || orgDefaults.companyAddress || null,
      }
      const res = await fetchData({
        method: isNew ? 'POST' : 'PUT',
        endpoint: isNew ? '/invoices' : `/invoices/${doc.id}`,
        data: payload,
      })
      if (res?.success) {
        setDoc(res.data)
        toast.success('Saved')
        loadList()
      } else {
        toast.error(res?.message || 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!doc?.id || !confirm('Delete this document?')) return
    const res = await fetchData({ method: 'DELETE', endpoint: `/invoices/${doc.id}` })
    if (res?.success) {
      setDoc(null)
      loadList()
      toast.success('Deleted')
    }
  }

  const send = async () => {
    if (!doc?.id) return
    const email = sendEmail || doc.clientEmail
    if (!email) return
    const pdfBase64 = await invoicePdfBase64(doc)
    const res = await fetchData({
      method: 'POST',
      endpoint: `/invoices/${doc.id}/send`,
      data: { email, pdfBase64, pdfFileName: `${doc.number}.pdf` },
    })
    if (res?.success) {
      toast.success('Sent')
      setDoc(res.data)
      loadList()
    } else {
      toast.error(res?.message || 'Send failed')
    }
  }

  const payLink = async () => {
    if (!doc?.id) return
    const res = await fetchData({ method: 'POST', endpoint: `/invoices/${doc.id}/payment-link` })
    if (res?.success) {
      toast.success('Payment link created')
      patch({ paymentLinks: { ...(doc.paymentLinks || {}), stripeUrl: res.data.url } })
    } else {
      toast.error(res?.message || 'Could not create payment link')
    }
  }

  const convert = async () => {
    if (!doc?.id) return
    const res = await fetchData({ method: 'POST', endpoint: `/invoices/${doc.id}/convert` })
    if (res?.success) {
      setDoc(res.data)
      toast.success('Converted to invoice')
      loadList()
    }
  }

  const searchCustomers = async (q: string) => {
    setCustomerQuery(q)
    if (q.length < 2) {
      setCustomers([])
      return
    }
    const res = await fetchCustomers({ method: 'GET', endpoint: `/customers?search=${encodeURIComponent(q)}&limit=8`, silent: true })
    const rows = res?.data?.customers || res?.data || []
    setCustomers(Array.isArray(rows) ? rows : [])
  }

  const totals = useMemo(() => doc ? calcInvoiceTotals({
    items: doc.items,
    discount: doc.discount,
    taxRate: doc.taxRate,
    taxIncluded: doc.taxIncluded,
    depositPaid: doc.depositPaid,
  }) : null, [doc])

  const usingCustomLogo = Boolean(doc?.logoUrl && orgDefaults.logoUrl && doc.logoUrl !== orgDefaults.logoUrl)
  const hasLogo = Boolean(doc?.logoUrl)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Quotes</h1>
          <p className="text-sm text-gray-600">Organization-branded documents. POS sale receipts are unchanged.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-md border text-sm text-violet-700 border-violet-300"
            onClick={() => setShowAiListScan(true)}
          >
            Scan list (AI)
          </button>
          <button className="px-3 py-2 rounded-md bg-orange-600 text-white text-sm" onClick={() => startNew('invoice')}>New invoice</button>
          <button className="px-3 py-2 rounded-md border text-sm" onClick={() => startNew('quote')}>New quote</button>
        </div>
      </div>

      {showAiListScan && (
        <AiListScanModal
          open={showAiListScan}
          onClose={() => setShowAiListScan(false)}
          mode="invoices"
          onConfirmLines={(lines) => void startQuoteFromAiLines(lines)}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-3 bg-white border rounded-lg p-3 space-y-3">
          <div className="flex gap-2">
            {(['all', 'invoice', 'quote'] as const).map((f) => (
              <button key={f} className={`text-xs px-2 py-1 rounded ${filter === f ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <input className="w-full border rounded-md px-2 py-1.5 text-sm" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadList()} />
          <div className="space-y-1 max-h-[70vh] overflow-auto">
            {list.map((row) => (
              <button key={row.id} onClick={() => openExisting(row.id!)} className={`w-full text-left p-2 rounded border ${doc?.id === row.id ? 'border-orange-400 bg-orange-50' : 'border-transparent hover:bg-gray-50'}`}>
                <div className="font-medium text-sm">{row.number}</div>
                <div className="text-xs text-gray-500">{row.clientName || 'No client'} · {row.status}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-5 bg-white border rounded-lg p-4 space-y-4">
          {!doc && <p className="text-gray-500 text-sm">Select a document or create a new one.</p>}
          {doc && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <select className="border rounded-md px-2 py-2 text-sm" value={doc.type} onChange={(e) => patch({ type: e.target.value as any })}>
                  <option value="invoice">Invoice</option>
                  <option value="quote">Quote</option>
                </select>
                <select className="border rounded-md px-2 py-2 text-sm" value={doc.status} onChange={(e) => patch({ status: e.target.value as InvoiceStatus })}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <input className="border rounded-md px-2 py-2 text-sm" value={doc.number} onChange={(e) => patch({ number: e.target.value })} placeholder="Number" />
                <input className="border rounded-md px-2 py-2 text-sm" type="date" value={doc.date} onChange={(e) => patch({ date: e.target.value })} />
                <input className="border rounded-md px-2 py-2 text-sm" type="date" value={doc.dueDate || ''} onChange={(e) => patch({ dueDate: e.target.value })} />
                <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={Boolean(doc.draftWatermark)} onChange={(e) => patch({ draftWatermark: e.target.checked })} /> Draft watermark</label>
              </div>

              <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Company on this document</h3>
                  <button
                    type="button"
                    className="text-xs text-orange-700 hover:underline"
                    onClick={() => patch({
                      companyName: orgDefaults.companyName,
                      companyTaxId: orgDefaults.companyTaxId,
                      companyEmail: orgDefaults.companyEmail,
                      companyPhone: orgDefaults.companyPhone,
                      companyAddress: orgDefaults.companyAddress,
                      companyWebsite: orgDefaults.companyWebsite,
                      logoUrl: orgDefaults.logoUrl,
                    })}
                  >
                    Reset to org profile
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Edit address / logo for this quote or invoice only. Leave logo empty to keep the organization default.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="border rounded-md px-2 py-1.5 text-sm bg-white" placeholder="Company name" value={doc.companyName || ''} onChange={(e) => patch({ companyName: e.target.value })} />
                  <input className="border rounded-md px-2 py-1.5 text-sm bg-white" placeholder="Tax ID" value={doc.companyTaxId || ''} onChange={(e) => patch({ companyTaxId: e.target.value })} />
                  <input className="border rounded-md px-2 py-1.5 text-sm bg-white" placeholder="Phone" value={doc.companyPhone || ''} onChange={(e) => patch({ companyPhone: e.target.value })} />
                  <input className="border rounded-md px-2 py-1.5 text-sm bg-white" placeholder="Email" value={doc.companyEmail || ''} onChange={(e) => patch({ companyEmail: e.target.value })} />
                  <input className="col-span-2 border rounded-md px-2 py-1.5 text-sm bg-white" placeholder="Website" value={doc.companyWebsite || ''} onChange={(e) => patch({ companyWebsite: e.target.value })} />
                  <textarea
                    className="col-span-2 border rounded-md px-2 py-1.5 text-sm bg-white"
                    rows={3}
                    placeholder="Company address (editable per document)"
                    value={doc.companyAddress || ''}
                    onChange={(e) => patch({ companyAddress: e.target.value })}
                  />
                </div>
                <div className="bg-white border rounded-md p-2 space-y-2">
                  <PhotoUploadInput
                    label="Document logo"
                    max={1}
                    folder="invoices"
                    photos={hasLogo ? [doc.logoUrl!] : []}
                    onChange={(photos) => patch({ logoUrl: photos[0] || null })}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {usingCustomLogo && <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">Custom logo for this document</span>}
                    {!usingCustomLogo && hasLogo && <span>Using organization default logo</span>}
                    {!hasLogo && <span>No logo   PDF will use org default on save if available</span>}
                    {orgDefaults.logoUrl && (
                      <button
                        type="button"
                        className="text-orange-700 hover:underline"
                        onClick={() => patch({ logoUrl: orgDefaults.logoUrl })}
                      >
                        Use org logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Client</h3>
                <input className="w-full border rounded-md px-2 py-1.5 text-sm mb-2" placeholder="Search existing customers" value={customerQuery} onChange={(e) => searchCustomers(e.target.value)} />
                {customers.length > 0 && (
                  <div className="border rounded-md mb-2 max-h-32 overflow-auto">
                    {customers.map((c) => (
                      <button key={c.id} type="button" className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-50" onClick={() => {
                        patch({
                          customerId: c.id,
                          clientName: c.name,
                          clientEmail: c.email,
                          clientPhone: c.phone,
                          clientMobile: c.alternatePhone,
                          clientAddress: c.address,
                        })
                        setCustomers([])
                        setCustomerQuery(c.name)
                      }}>{c.name} · {c.phone}</button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="Client name" value={doc.clientName || ''} onChange={(e) => patch({ clientName: e.target.value })} />
                  <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="Company" value={doc.clientCompany || ''} onChange={(e) => patch({ clientCompany: e.target.value })} />
                  <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="Email" value={doc.clientEmail || ''} onChange={(e) => patch({ clientEmail: e.target.value })} />
                  <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="Phone" value={doc.clientPhone || ''} onChange={(e) => patch({ clientPhone: e.target.value })} />
                  <input className="col-span-2 border rounded-md px-2 py-1.5 text-sm" placeholder="Address" value={doc.clientAddress || ''} onChange={(e) => patch({ clientAddress: e.target.value })} />
                </div>
              </div>

              <LineItemsEditor items={doc.items} onChange={(items) => patch({ items })} />

              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded-md px-2 py-1.5 text-sm" type="number" placeholder="Discount" value={doc.discount} onChange={(e) => patch({ discount: Number(e.target.value) })} />
                <input className="border rounded-md px-2 py-1.5 text-sm" type="number" placeholder="Deposit paid" value={doc.depositPaid} onChange={(e) => patch({ depositPaid: Number(e.target.value) })} />
                <input className="border rounded-md px-2 py-1.5 text-sm" type="number" placeholder="Tax rate" value={doc.taxRate} onChange={(e) => patch({ taxRate: Number(e.target.value) })} />
                <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={doc.taxIncluded} onChange={(e) => patch({ taxIncluded: e.target.checked })} /> Tax included in rates</label>
              </div>
              {totals && <div className="text-sm font-medium">Total {totals.total.toFixed(2)} {(doc.currency || 'lkr').toUpperCase()}</div>}

              <textarea className="w-full border rounded-md px-2 py-1.5 text-sm" rows={2} placeholder="Notes" value={doc.notes || ''} onChange={(e) => patch({ notes: e.target.value })} />

              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-2 rounded-md bg-orange-600 text-white text-sm" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
                <button className="px-3 py-2 rounded-md border text-sm" onClick={() => downloadInvoicePdf(doc)}>Download PDF</button>
                {doc.type === 'quote' && doc.id && <button className="px-3 py-2 rounded-md border text-sm" onClick={convert}>Convert to invoice</button>}
                {doc.hasStripe && doc.id && <button className="px-3 py-2 rounded-md border text-sm" onClick={payLink}>Stripe pay link</button>}
                {doc.id && <button className="px-3 py-2 rounded-md border text-red-600 text-sm" onClick={remove}>Delete</button>}
              </div>
              {doc.id && (
                <div className="flex gap-2">
                  <input className="flex-1 border rounded-md px-2 py-1.5 text-sm" placeholder="Send to email" value={sendEmail || doc.clientEmail || ''} onChange={(e) => setSendEmail(e.target.value)} />
                  <button className="px-3 py-2 rounded-md border text-sm" onClick={send}>Email</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="xl:col-span-4">
          {doc && <InvoicePreviewPanel inv={doc} />}
        </div>
      </div>
    </div>
  )
}
