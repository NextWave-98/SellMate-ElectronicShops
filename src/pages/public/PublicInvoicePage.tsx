import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import InvoicePreviewPanel from '../../components/invoices/InvoicePreviewPanel'
import { downloadInvoicePdf } from '../../lib/invoices/invoice-pdf'
import type { InvoiceDocument } from '../../lib/invoices/types'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api'

export default function PublicInvoicePage() {
  const { shareToken } = useParams()
  const [params] = useSearchParams()
  const [doc, setDoc] = useState<InvoiceDocument | null>(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)

  const load = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/public/invoices/${shareToken}`)
      if (res.data?.success) setDoc(res.data.data)
      else setError(res.data?.message || 'Not found')
    } catch {
      setError('Invoice not found')
    }
  }

  useEffect(() => {
    load()
  }, [shareToken])

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (!sessionId || !shareToken) return
    axios.post(`${BASE_URL}/public/invoices/${shareToken}/confirm`, { sessionId }).then(() => load())
  }, [params, shareToken])

  const pay = async () => {
    if (!shareToken) return
    setPaying(true)
    try {
      const res = await axios.post(`${BASE_URL}/public/invoices/${shareToken}/checkout`)
      if (res.data?.data?.url) window.location.href = res.data.data.url
    } finally {
      setPaying(false)
    }
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">{error}</div>
  }
  if (!doc) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded-md border bg-white text-sm" onClick={() => downloadInvoicePdf(doc)}>Download PDF</button>
          {doc.hasStripe && doc.status !== 'paid' && (
            <button className="px-3 py-2 rounded-md bg-orange-600 text-white text-sm" disabled={paying} onClick={pay}>
              {paying ? 'Redirecting...' : 'Pay now'}
            </button>
          )}
        </div>
        {doc.status === 'paid' && <div className="bg-green-50 text-green-700 px-3 py-2 rounded-md text-sm">This invoice has been paid.</div>}
        <InvoicePreviewPanel inv={doc} />
      </div>
    </div>
  )
}
