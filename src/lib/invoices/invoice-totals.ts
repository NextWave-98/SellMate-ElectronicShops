export interface InvoiceTotalsItem {
  hours?: number
  quantity?: number
  rate?: number
  monthly?: boolean
}

export interface InvoiceTotalsInput {
  items: InvoiceTotalsItem[]
  discount?: number
  taxRate?: number
  taxIncluded?: boolean
  depositPaid?: number
}

export interface InvoiceTotals {
  subtotal: number
  discountAmt: number
  taxable: number
  exTax: number
  tax: number
  total: number
  balance: number
}

export function calcInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const subtotal = input.items.reduce((s, i) => {
    if (i.monthly) return s
    const qty = Number(i.hours ?? i.quantity ?? 0) || 0
    return s + qty * (Number(i.rate) || 0)
  }, 0)
  const discountAmt = Number(input.discount) || 0
  const taxable = subtotal - discountAmt
  const taxRate = Number(input.taxRate ?? 0) || 0
  const taxIncluded = Boolean(input.taxIncluded)

  let tax: number
  let exTax: number
  let total: number

  if (taxIncluded) {
    const divisor = 1 + taxRate / 100
    exTax = divisor > 0 ? taxable / divisor : taxable
    tax = taxable - exTax
    total = taxable
  } else {
    exTax = taxable
    tax = 0
    total = taxable
  }

  const balance = total - (Number(input.depositPaid) || 0)
  return { subtotal, discountAmt, taxable, exTax, tax, total, balance }
}

export function buildTotalsDisplayLines(
  totals: InvoiceTotals,
  opts: { taxIncluded?: boolean; taxRate?: number; taxLabel?: string },
): Array<{ label: string; value: string; bold?: boolean }> {
  const taxRate = opts.taxRate ?? 0
  const taxLabel = opts.taxLabel || 'VAT'
  const lines: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Subtotal', value: totals.subtotal.toFixed(2) },
  ]
  if (totals.discountAmt > 0) {
    lines.push({ label: 'Discount', value: `-${totals.discountAmt.toFixed(2)}` })
  }
  if (opts.taxIncluded) {
    lines.push({ label: `${taxLabel} included (${taxRate}%)`, value: totals.tax.toFixed(2) })
    lines.push({ label: `Amount ex ${taxLabel}`, value: totals.exTax.toFixed(2) })
    lines.push({ label: `Total (${taxLabel} Incl.)`, value: totals.total.toFixed(2), bold: true })
  } else {
    lines.push({ label: 'Total', value: totals.total.toFixed(2), bold: true })
  }
  if (Math.abs(totals.balance - totals.total) > 0.001) {
    lines.push({ label: 'Balance due', value: totals.balance.toFixed(2), bold: true })
  }
  return lines
}

export function buildTotalsPdfLines(
  totals: InvoiceTotals,
  opts: { taxIncluded?: boolean; taxRate?: number; taxLabel?: string },
): [string, string][] {
  return buildTotalsDisplayLines(totals, opts).map((l) => [l.label.toUpperCase(), l.value])
}
