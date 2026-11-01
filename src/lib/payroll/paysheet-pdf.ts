import { jsPDF } from 'jspdf'

export type PaysheetOrg = {
  name: string
  logo?: string | null
  address?: string | null
  telephone?: string | null
  email?: string | null
  website?: string | null
  taxId?: string | null
  city?: string | null
  district?: string | null
  postalCode?: string | null
}

export type PaysheetSlip = {
  id: string
  staffName: string
  staffCode: string
  runNumber: string
  periodStart: string
  periodEnd: string
  status: string
  daysWorked: number
  totalWorkingDays: number
  monthlySalary: number
  earnedBasic: number
  /** Org % cut applied to earned basic — shown on PDF as EPF. */
  basicDeductionPercent?: number
  /**
   * When true, Bonuses include the EPF cut rebound so net basic effect stays full.
   */
  reimburseBasicCutAsBonus?: boolean
  allowancesTotal: number
  unusedLeavePay: number
  unusedLeaveDays?: number
  monthlyLeaveQuota?: number
  monthlyLeaveUsed?: number
  overtimePay: number
  overtimeHours?: number
  hoursWorked?: number
  standardHours?: number
  commissionEarned: number
  addCommissionToBasic: boolean
  /** When false, sales commission / sales rows are omitted from the PDF. */
  commissionEnabled?: boolean
  totalSales: number
  bonuses: number
  deductions: number
  netPayable: number
  allowancesBreakdown?: Array<{
    name: string
    code: string
    amount: number
    applied: boolean
    skippedReason?: string | null
  }>
}

async function compressLogoForPDF(b64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxW = 280
      const scale = Math.min(1, maxW / img.width)
      canvas.width = Math.max(1, img.width * scale)
      canvas.height = Math.max(1, img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(b64)
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.65))
    }
    img.onerror = () => resolve(b64)
    img.src = b64
  })
}

async function fetchLogoDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function getImageFitInBox(doc: jsPDF, imageData: string, maxWidth: number, maxHeight: number) {
  let imgWidth = maxWidth
  let imgHeight = maxHeight
  try {
    const props = (doc as any).getImageProperties(imageData)
    if (props?.width && props?.height) {
      imgWidth = Number(props.width)
      imgHeight = Number(props.height)
    }
  } catch {
    /* fallback */
  }
  const safeWidth = imgWidth > 0 ? imgWidth : maxWidth
  const safeHeight = imgHeight > 0 ? imgHeight : maxHeight
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight)
  return {
    width: safeWidth * scale,
    height: safeHeight * scale,
    offsetX: (maxWidth - safeWidth * scale) / 2,
    offsetY: (maxHeight - safeHeight * scale) / 2,
  }
}

/** ASCII-safe money — avoids locale narrow spaces that break Helvetica in jsPDF. */
function money(n: number) {
  const v = Math.round(Number(n || 0) * 100) / 100
  const neg = v < 0
  const abs = Math.abs(v).toFixed(2)
  const [whole, frac] = abs.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${neg ? '-' : ''}${grouped}.${frac}`
}

function fmtDate(iso: string) {
  if (!iso) return '-'
  const d = String(iso).slice(0, 10)
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return `${day}/${m}/${y}`
}

function safeText(s: string) {
  // Strip characters Helvetica cannot render (causes spaced/garbled glyphs in jsPDF).
  return String(s || '')
    .replace(/[–—−]/g, '-')
    .replace(/[·•]/g, '-')
    .replace(/[→←]/g, '-')
    .replace(/\u00a0|\u202f|\u2009/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
}

/**
 * Branded single-staff paysheet PDF (A4) for download from payroll history.
 */
export async function generatePaysheetPdf(org: PaysheetOrg, slip: PaysheetSlip) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = 210
  const H = 297
  const lm = 14
  const rm = 14
  const usable = W - lm - rm
  const colAmt = W - rm - 2

  const ink = '#1c1917'
  const muted = '#57534e'
  const line = '#a8a29e'
  const lineSoft = '#e7e5e4'
  const accent = '#0f766e'
  const soft = '#f5f5f4'

  let compressedLogo: string | null = null
  const rawLogo = await fetchLogoDataUrl(org.logo || undefined)
  if (rawLogo?.startsWith('data:')) {
    try {
      compressedLogo = await compressLogoForPDF(rawLogo)
    } catch {
      compressedLogo = null
    }
  }

  const addressBits = [org.address, org.city, org.district, org.postalCode].filter(Boolean)
  const contactBits = [
    org.telephone ? `Tel: ${org.telephone}` : '',
    org.email || '',
    org.website || '',
  ].filter(Boolean)

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(soft)
  doc.rect(0, 0, W, 38, 'F')
  doc.setDrawColor(line)
  doc.setLineWidth(0.4)
  doc.line(lm, 38, W - rm, 38)

  let headerTextMaxW = usable - 42
  if (compressedLogo?.startsWith('data:')) {
    try {
      const fmt = compressedLogo.includes('jpeg') ? 'JPEG' : 'PNG'
      const logoBox = { x: W - rm - 34, y: 6, w: 34, h: 26 }
      const fit = getImageFitInBox(doc, compressedLogo, logoBox.w, logoBox.h)
      doc.addImage(
        compressedLogo,
        fmt,
        logoBox.x + fit.offsetX,
        logoBox.y + fit.offsetY,
        fit.width,
        fit.height,
      )
    } catch {
      headerTextMaxW = usable
    }
  } else {
    headerTextMaxW = usable
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(ink)
  const orgNameLines = doc.splitTextToSize(safeText(org.name || 'Organization'), headerTextMaxW)
  doc.text(orgNameLines, lm, 12)

  let hy = 12 + orgNameLines.length * 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(muted)
  if (addressBits.length) {
    const addr = doc.splitTextToSize(safeText(addressBits.join(', ')), headerTextMaxW)
    doc.text(addr, lm, hy)
    hy += addr.length * 3.6
  }
  if (contactBits.length) {
    doc.text(safeText(contactBits.join('  |  ')), lm, hy)
    hy += 3.6
  }
  if (org.taxId) {
    doc.text(safeText(`Tax ID: ${org.taxId}`), lm, hy)
  }

  // ── Title ───────────────────────────────────────────────────────────────
  let y = 48
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(accent)
  doc.text('PAYSHEET', lm, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(muted)
  doc.text(
    safeText(
      `Run ${slip.runNumber}  |  ${fmtDate(slip.periodStart)} - ${fmtDate(slip.periodEnd)}`,
    ),
    lm,
    y,
  )

  // ── Staff meta ──────────────────────────────────────────────────────────
  y += 8
  const metaH = 18
  doc.setDrawColor(line)
  doc.setLineWidth(0.35)
  doc.setFillColor(255, 255, 255)
  doc.rect(lm, y, usable, metaH, 'S')

  const c1 = lm + 3
  const c2 = lm + usable * 0.38
  const c3 = lm + usable * 0.68

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(muted)
  doc.text('EMPLOYEE', c1, y + 5)
  doc.text('STAFF ID', c2, y + 5)
  doc.text('STATUS', c3, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(ink)
  doc.text(safeText(slip.staffName || '-'), c1, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.text(safeText(slip.staffCode || '-'), c2, y + 12)
  doc.text(safeText(String(slip.status || '').toUpperCase() || '-'), c3, y + 12)

  y += metaH + 8

  // ── EPF from basic % cut ─────────────────────────────────────────────────
  const pct = Math.max(0, Math.min(100, Number(slip.basicDeductionPercent ?? 0)))
  let epfAmount = 0
  let basicBeforeEpf = Number(slip.earnedBasic || 0)
  if (pct > 0 && pct < 100 && Number(slip.earnedBasic) > 0) {
    basicBeforeEpf = Number(slip.earnedBasic) / (1 - pct / 100)
    epfAmount = Math.round((basicBeforeEpf - Number(slip.earnedBasic)) * 100) / 100
  }

  type Row = { label: string; detail?: string; amount: number; isDeduction?: boolean }
  const rows: Row[] = [
    {
      label: 'Monthly salary (rate)',
      detail: `${slip.daysWorked}/${slip.totalWorkingDays} days worked`,
      amount: slip.monthlySalary,
    },
  ]

  if (epfAmount > 0) {
    rows.push({
      label: 'Basic before EPF',
      detail:
        slip.hoursWorked != null
          ? `${Number(slip.hoursWorked).toFixed(1)}h` +
            (slip.standardHours ? ` / ${Number(slip.standardHours).toFixed(0)}h std` : '')
          : undefined,
      amount: Math.round(basicBeforeEpf * 100) / 100,
    })
    rows.push({
      label: `EPF (${pct}%)`,
      detail: 'Deducted from basic',
      amount: -epfAmount,
      isDeduction: true,
    })
    rows.push({
      label: 'Earned basic (after EPF)',
      amount: slip.earnedBasic,
    })
  } else {
    rows.push({
      label: 'Earned basic',
      detail:
        slip.hoursWorked != null
          ? `${Number(slip.hoursWorked).toFixed(1)}h` +
            (slip.standardHours ? ` / ${Number(slip.standardHours).toFixed(0)}h std` : '')
          : undefined,
      amount: slip.earnedBasic,
    })
  }

  rows.push(
    {
      label: 'Allowances',
      detail:
        (slip.allowancesBreakdown || [])
          .filter((a) => a.applied)
          .map((a) => `${a.name} ${money(a.amount)}`)
          .join(', ') || undefined,
      amount: slip.allowancesTotal,
    },
    {
      label: 'Unused leave pay',
      detail:
        Number(slip.unusedLeavePay) > 0
          ? `${Number(slip.unusedLeaveDays ?? 0)} day(s) unused of quota ${Number(slip.monthlyLeaveQuota ?? 0)}`
          : undefined,
      amount: slip.unusedLeavePay,
    },
    {
      label: 'Overtime',
      detail:
        Number(slip.overtimeHours) > 0 ? `${Number(slip.overtimeHours).toFixed(1)}h` : undefined,
      amount: slip.overtimePay,
    },
  )

  // Hide sales commission entirely when the org does not pay commission.
  if (slip.commissionEnabled !== false) {
    rows.push({
      label: 'Sales commission',
      detail: `Sales ${money(slip.totalSales)}${slip.addCommissionToBasic ? '' : ' (separate)'}`,
      amount: slip.commissionEarned,
    })
  }

  rows.push(
    {
      label: 'Bonuses',
      detail:
        slip.reimburseBasicCutAsBonus === true && epfAmount > 0
          ? `Includes EPF rebate ${money(epfAmount)}`
          : undefined,
      amount: slip.bonuses,
    },
    {
      label: 'Other deductions',
      amount: -Math.abs(Number(slip.deductions || 0)),
      isDeduction: true,
    },
  )

  // Table header
  doc.setFillColor(soft)
  doc.rect(lm, y, usable, 8, 'F')
  doc.setDrawColor(line)
  doc.setLineWidth(0.35)
  doc.line(lm, y, W - rm, y)
  doc.line(lm, y + 8, W - rm, y + 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(muted)
  doc.text('DESCRIPTION', lm + 3, y + 5.5)
  doc.text('AMOUNT (LKR)', colAmt, y + 5.5, { align: 'right' })
  y += 8

  for (const row of rows) {
    const detailLines = row.detail
      ? (doc.splitTextToSize(safeText(row.detail), usable - 48) as string[])
      : []
    const blockH = 7 + detailLines.length * 3.4

    if (y + blockH > H - 52) {
      doc.addPage()
      y = 18
      doc.setFillColor(soft)
      doc.rect(lm, y, usable, 8, 'F')
      doc.setDrawColor(line)
      doc.line(lm, y, W - rm, y)
      doc.line(lm, y + 8, W - rm, y + 8)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(muted)
      doc.text('DESCRIPTION', lm + 3, y + 5.5)
      doc.text('AMOUNT (LKR)', colAmt, y + 5.5, { align: 'right' })
      y += 8
    }

    const textY = y + 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(ink)
    doc.text(safeText(row.label), lm + 3, textY)
    doc.setTextColor(row.isDeduction || row.amount < 0 ? '#b91c1c' : ink)
    doc.text(money(row.amount), colAmt, textY, { align: 'right' })

    let dy = textY
    if (detailLines.length) {
      dy += 4
      doc.setFontSize(7.5)
      doc.setTextColor(muted)
      doc.text(detailLines.map(safeText), lm + 3, dy)
      dy += (detailLines.length - 1) * 3.4
    }

    y = Math.max(y + blockH, dy + 3)
    doc.setDrawColor(lineSoft)
    doc.setLineWidth(0.25)
    doc.line(lm, y, W - rm, y)
  }

  // Net band
  y += 5
  doc.setFillColor(accent)
  doc.rect(lm, y, usable, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('NET PAYABLE', lm + 4, y + 9)
  doc.setFontSize(12)
  doc.text(money(slip.netPayable), colAmt, y + 9, { align: 'right' })

  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(muted)
  const note = doc.splitTextToSize(
    'Generated from payroll history. Figures match the selected run and may change if the run is recalculated.',
    usable,
  )
  doc.text(note, lm, y)

  y += note.length * 4 + 10
  doc.setDrawColor(line)
  doc.setLineWidth(0.35)
  doc.line(lm, y, lm + 58, y)
  doc.line(W - rm - 58, y, W - rm, y)
  doc.setFontSize(7)
  doc.setTextColor(muted)
  doc.text('Prepared by', lm, y + 5)
  doc.text('Employee acknowledgement', W - rm - 58, y + 5)

  doc.setFontSize(7)
  doc.setTextColor(muted)
  doc.text(
    safeText(`${org.name || 'Organization'} | Paysheet | ${fmtDate(new Date().toISOString())}`),
    lm,
    H - 10,
  )
  doc.text('Page 1', colAmt, H - 10, { align: 'right' })

  const safeName = (slip.staffCode || slip.staffName || 'staff').replace(/[^\w.-]+/g, '_')
  const safeRun = (slip.runNumber || 'run').replace(/[^\w.-]+/g, '_')
  doc.save(`paysheet-${safeRun}-${safeName}.pdf`)
}
