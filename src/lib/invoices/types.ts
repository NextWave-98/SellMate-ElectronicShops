export type InvoiceDocType = 'invoice' | 'quote'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export interface InvoiceLineItem {
  description?: string
  hours?: number
  quantity?: number
  rate?: number
  monthly?: boolean
}

export interface InvoiceScopeSection {
  heading?: string
  body?: string
}

export interface InvoiceBankDetails {
  bankName?: string
  accountName?: string
  branchCode?: string
  accountNumber?: string
  reference?: string
}

export interface InvoicePaymentLinks {
  paypalUrl?: string
  payIdNumber?: string
  payIdName?: string
  stripeUrl?: string
  stripeLinkTotal?: number
}

export interface InvoiceDocument {
  id?: string
  type: InvoiceDocType
  number: string
  date: string
  dueDate?: string | null
  companyName?: string | null
  companyTaxId?: string | null
  companyEmail?: string | null
  companyPhone?: string | null
  companyAddress?: string | null
  companyWebsite?: string | null
  logoUrl?: string | null
  clientName?: string | null
  clientCompany?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  clientMobile?: string | null
  clientAddress?: string | null
  customerId?: string | null
  items: InvoiceLineItem[]
  scopeSections: InvoiceScopeSection[]
  taxRate: number
  taxLabel: string
  taxIncluded: boolean
  discount: number
  depositPaid: number
  monthlyPayment: boolean
  bankDetails?: InvoiceBankDetails | null
  paymentLinks?: InvoicePaymentLinks | null
  notes?: string | null
  paymentTerms?: string | null
  status: InvoiceStatus
  shareToken?: string | null
  draftWatermark?: boolean
  currency?: string
  hasStripe?: boolean
}
