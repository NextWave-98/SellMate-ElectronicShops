import { jsPDF } from 'jspdf'
import { calcInvoiceTotals, buildTotalsPdfLines } from './invoice-totals'
import type { InvoiceDocument } from './types'

async function compressLogoForPDF(b64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxW = 300
      const scale = Math.min(1, maxW / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(b64); return }
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
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
    if (props?.width && props?.height) { imgWidth = Number(props.width); imgHeight = Number(props.height) }
  } catch { /* fallback */ }
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

export async function generateInvoicePdf(inv: InvoiceDocument) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  const W = 210
  const H = 297
  const lm = 15
  const rm = 15
  const usable = W - lm - rm

  const cDk = '#231F20'
  const cGy = '#808080'
  const cLGy = '#555555'
  const cBl = '#ea580c'
  const cBd = '#CCCCCC'

  const pageBottom = H - 25
  let pageCount = 1

  const websiteUrl = inv.companyWebsite || ''

  const totals = calcInvoiceTotals({
    items: inv.items || [],
    discount: inv.discount,
    taxRate: inv.taxRate,
    taxIncluded: inv.taxIncluded,
    depositPaid: inv.depositPaid,
  })

  let compressedLogo: string | null = null
  const rawLogo = await fetchLogoDataUrl(inv.logoUrl || undefined)
  if (rawLogo?.startsWith('data:')) {
    try { compressedLogo = await compressLogoForPDF(rawLogo) } catch { compressedLogo = null }
  }

  function addNewPage(): number { doc.addPage(); pageCount++; return 15 }

  function drawPageHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(cDk)
    doc.text(inv.companyName || 'Your Company', lm, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(cDk)
    const coLines = [
      inv.companyAddress,
      inv.companyPhone ? `Tel: ${inv.companyPhone}` : '',
      inv.companyEmail || '',
      inv.companyTaxId ? `${inv.taxLabel || 'Tax ID'}: ${inv.companyTaxId}` : '',
    ].filter(Boolean) as string[]
    coLines.forEach((ln, i) => doc.text(ln, lm, 17 + i * 4))

    if (compressedLogo?.startsWith('data:')) {
      try {
        const fmt = compressedLogo.includes('jpeg') ? 'JPEG' : 'PNG'
        const logoBox = { x: W - rm - 38, y: 8, w: 38, h: 20 }
        const fit = getImageFitInBox(doc, compressedLogo, logoBox.w, logoBox.h)
        const imgX = logoBox.x + fit.offsetX
        const imgY = logoBox.y + fit.offsetY
        doc.addImage(compressedLogo, fmt, imgX, imgY, fit.width, fit.height)
        if (websiteUrl) doc.link(imgX, imgY, fit.width, fit.height, { url: websiteUrl })
      } catch { /* ignore */ }
    }
  }

  function lb(t: string, x: number, y: number) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(cGy); doc.text(t, x, y)
  }
  function vv(t: string, x: number, y: number) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(cDk); doc.text(t || '', x, y)
  }

  // ── PAGE 1 header
  drawPageHeader()
  const isInvoice = inv.type === 'invoice'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(cBl)
  doc.text(isInvoice ? 'Tax Invoice' : 'Quotation', lm, 47)
  doc.setDrawColor(cBd)
  doc.setLineWidth(0.4)
  doc.line(lm, 50, W - rm, 50)

  const TOP = 54
  const c1 = lm, c2 = 68, c3 = 118

  lb('BILL TO', c1, TOP)
  vv(inv.clientName || '-', c1, TOP + 5)
  if (inv.clientAddress) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(cDk)
    doc.text(doc.splitTextToSize(inv.clientAddress, 50), c1, TOP + 10)
  }

  const metaRows: [[string, string], [string, string]][] = [
    [[isInvoice ? 'INVOICE NO.' : 'QUOTE NO.', inv.number || '-'], ['DATE', inv.date || '-']],
    [[isInvoice ? 'DUE DATE' : 'VALID UNTIL', inv.dueDate || '-'], ['EMAIL', inv.clientEmail || '-']],
  ]
  metaRows.forEach((row, ri) => {
    const ly = TOP + ri * 12, vy = ly + 5
    lb(row[0][0], c2, ly); lb(row[1][0], c3, ly)
    vv(row[0][1], c2, vy); vv(row[1][1], c3, vy)
  })

  const contactY = TOP + 27
  if (inv.clientMobile) { lb('MOBILE', c1, contactY); vv(inv.clientMobile, c1, contactY + 5) }
  if (inv.clientPhone) { lb('PHONE', c2, contactY); vv(inv.clientPhone, c2, contactY + 5) }

  doc.setDrawColor(cBd); doc.setLineWidth(0.4)
  doc.line(lm, contactY + 10, W - rm, contactY + 10)

  let currentY = contactY + 15

  // ── SCOPE SECTIONS
  if (inv.scopeSections?.length) {
    const scopeLineHeight = 4.6
    const headingLineHeight = 5.5
    const padX = 5, padTop = 8, padBottom = 6, sectionGap = 4
    const labelH = 7
    const contentW = usable - padX * 2

    type ScopeLine = { lh: number; gapBefore: number; render: (y: number) => void }
    const scopeLines: ScopeLine[] = []

    inv.scopeSections.forEach((s, i) => {
      if (s.heading) {
        const hasPrice = s.price !== null && s.price !== undefined && !Number.isNaN(Number(s.price))
        const headingText = hasPrice ? `${s.heading} - ${Number(s.price).toFixed(2)}` : s.heading
        const hLines = doc.splitTextToSize(headingText, contentW) as string[]
        hLines.forEach((hl, idx) =>
          scopeLines.push({
            lh: headingLineHeight,
            gapBefore: idx === 0 ? (i > 0 ? sectionGap : 0) : 0,
            render: (y) => {
              doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(26, 26, 46)
              doc.text(hl, lm + padX, y)
            },
          })
        )
      }
      if (s.body) {
        const bLines = doc.splitTextToSize(s.body, contentW) as string[]
        bLines.forEach((line, idx) =>
          scopeLines.push({
            lh: scopeLineHeight,
            gapBefore: idx === 0 ? (s.heading ? 2 : i > 0 ? sectionGap : 0) : 0,
            render: (y) => {
              doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(cDk)
              doc.text(line, lm + padX, y)
            },
          })
        )
      }
    })

    if (currentY + padTop + labelH + headingLineHeight + padBottom > pageBottom) {
      currentY = addNewPage()
    }

    let idx = 0, firstSegment = true
    while (idx < scopeLines.length) {
      const segTopY = currentY
      const textStartY = segTopY + padTop + labelH
      let measureY = textStartY, fitEnd = idx
      while (fitEnd < scopeLines.length) {
        const ln = scopeLines[fitEnd]
        const need = ln.gapBefore + ln.lh
        if (measureY + need + padBottom > pageBottom && fitEnd > idx) break
        measureY += need
        fitEnd++
      }
      const segBottomY = measureY + padBottom

      doc.setFillColor(245, 245, 245)
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.4)
      doc.roundedRect(lm, segTopY, usable, segBottomY - segTopY, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(cGy)
      doc.text(firstSegment ? 'DESCRIPTION OF WORK' : 'DESCRIPTION OF WORK (CONTINUED)', lm + padX, segTopY + padTop)

      let drawY = textStartY
      for (let j = idx; j < fitEnd; j++) {
        const ln = scopeLines[j]
        drawY += ln.gapBefore
        ln.render(drawY)
        drawY += ln.lh
      }

      idx = fitEnd
      currentY = segBottomY
      firstSegment = false
      if (idx < scopeLines.length) currentY = addNewPage()
    }
    currentY += 6
  }

  // ── LINE ITEMS TABLE
  if ((inv.items || []).some((it) => it.description || it.rate)) {
    if (currentY + 10 > pageBottom) currentY = addNewPage()

    const cx = [lm, lm + 110, lm + 142, lm + 160]
    const crx = [lm + 110, lm + 142, W - rm, W - rm]

    function drawHdr(y: number) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(cBl)
      doc.text('DESCRIPTION', cx[0] + 1, y)
      doc.text('HRS/QTY', crx[0] - 1, y, { align: 'right' })
      doc.text('RATE', crx[1] - 1, y, { align: 'right' })
      doc.text('AMOUNT', crx[2] - 1, y, { align: 'right' })
      doc.setDrawColor(cBd); doc.setLineWidth(0.4)
      doc.line(lm, y + 3, W - rm, y + 3)
    }

    drawHdr(currentY); currentY += 3

    ;(inv.items || []).forEach((item) => {
      if (!item.description && !item.rate) return
      const qty = Number(item.hours ?? item.quantity ?? 0)
      const rate = Number(item.rate || 0)
      const dLines = doc.splitTextToSize(item.description || '', crx[0] - cx[0] - 4)
      const rh = Math.max(6.5, dLines.length * 4.2) + 2
      if (currentY + rh > pageBottom) { currentY = addNewPage(); drawHdr(currentY); currentY += 3 }

      const amt = item.monthly ? 0 : qty * rate
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(cDk)
      doc.text(dLines, cx[0] + 1, currentY + 5)
      doc.text(String(qty), crx[0] - 1, currentY + 5, { align: 'right' })
      doc.text(rate.toFixed(2), crx[1] - 1, currentY + 5, { align: 'right' })
      doc.text(item.monthly ? 'Monthly' : amt.toFixed(2), crx[2] - 1, currentY + 5, { align: 'right' })
      doc.setDrawColor('#E0E0E0'); doc.setLineWidth(0.3)
      doc.line(lm, currentY + rh, W - rm, currentY + rh)
      currentY += rh
    })
  }

  // ── TOTALS
  const afterY = currentY + (isInvoice ? 6 : 3)
  if (afterY + 70 > pageBottom) currentY = addNewPage()
  else currentY = afterY

  doc.setDrawColor('#AAAAAA'); doc.setLineWidth(0.5)
  doc.setLineDashPattern([1, 1], 0)
  doc.line(lm, currentY, W - rm, currentY)
  doc.setLineDashPattern([], 0)

  const tlx = 127
  const totY = currentY + 5

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(cLGy)
  doc.text('We appreciate your business and look forward to working with you.', lm, totY)

  const tLines = buildTotalsPdfLines(totals, {
    taxIncluded: inv.taxIncluded,
    taxRate: inv.taxRate,
    taxLabel: inv.taxLabel,
  })

  tLines.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(cLGy)
    doc.text(k, tlx, totY + i * 5)
    doc.setTextColor(cDk); doc.text(v, W - rm, totY + i * 5, { align: 'right' })
  })

  const dashY = totY + tLines.length * 5 + 3
  doc.setDrawColor('#AAAAAA'); doc.setLineWidth(0.5)
  doc.setLineDashPattern([1, 1], 0)
  doc.line(120, dashY + 2, W - rm, dashY + 2)
  doc.setLineDashPattern([], 0)

  const balY = dashY + 9
  const { total, balance } = totals
  const currency = (inv.currency || 'LKR').toUpperCase()
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(cLGy)
  doc.text('BALANCE DUE', tlx, balY)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(cDk)
  doc.text(`${currency} ${(inv.depositPaid > 0 ? balance : total).toFixed(2)}`, W - rm, balY, { align: 'right' })

  // ── PAYMENT SECTION
  const bank = inv.bankDetails
  const pl = inv.paymentLinks
  const hasBank = !!(bank?.bankName || bank?.accountNumber)

  let payY = balY + 14

  // Payment Details Box
  if (hasBank) {
    if (payY + 32 > pageBottom) payY = addNewPage()
    const bankLines: string[] = [
      bank?.bankName ? `Bank: ${bank.bankName}` : '',
      bank?.accountName ? `Account Name: ${bank.accountName}` : '',
      bank?.branchCode ? `Branch: ${bank.branchCode}` : '',
      bank?.accountNumber ? `Account: ${bank.accountNumber}` : '',
      bank?.reference ? `Ref: ${bank.reference}` : '',
    ].filter(Boolean)

    const boxH = 8 + bankLines.length * 5 + 4
    doc.setFillColor(232, 244, 249)
    doc.setDrawColor(197, 220, 232)
    doc.setLineWidth(0.4)
    doc.roundedRect(lm, payY, usable, boxH, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(cDk)
    doc.text('Payment Details', lm + 4, payY + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(cDk)
    let bY = payY + 12
    bankLines.forEach((line) => { doc.text(line, lm + 4, bY); bY += 5 })
    payY += boxH + 3
  }

  // Pay Online Button
  if (pl?.stripeUrl) {
    if (payY + 30 > pageBottom) payY = addNewPage()
    const btnW = 52, btnH = 16
    const btnX = W / 2 - btnW / 2

    doc.setFillColor(220, 38, 38)
    doc.roundedRect(btnX, payY, btnW, btnH, 3, 3, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255)
    doc.text('Pay Online', W / 2, payY + 7.5, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255)
    doc.text('Click here', W / 2, payY + 12.5, { align: 'center' })
    doc.link(btnX, payY, btnW, btnH, { url: pl.stripeUrl })
    payY += btnH + 5

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(cDk)
    doc.text('You can make your payment by clicking the button above.', W / 2, payY, { align: 'center' })
    payY += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(cLGy)
    doc.text('We use Stripe, a trusted and secure payment platform.', W / 2, payY, { align: 'center' })
    payY += 8
  } else if (pl?.paypalUrl) {
    if (payY + 12 > pageBottom) payY = addNewPage()
    const amtDue = inv.depositPaid > 0 ? balance : total
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 112, 186)
    doc.textWithLink(`Pay ${currency} ${amtDue.toFixed(2)} via PayPal   Click Here`, W / 2, payY, { url: pl.paypalUrl, align: 'center' })
    payY += 8
  }

  // Payment terms
  if (inv.paymentTerms) {
    const termsLines = doc.splitTextToSize(inv.paymentTerms, usable - 8) as string[]
    if (payY + termsLines.length * 3.5 > pageBottom) payY = addNewPage()
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(cLGy)
    termsLines.forEach((ln: string) => { doc.text(ln, W / 2, payY, { align: 'center' }); payY += 3.5 })
  }

  // Tax included note
  if (inv.taxIncluded) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(cGy)
    doc.text(`* ${inv.taxLabel || 'Tax'} is included in the above total`, W / 2, payY + 2, { align: 'center' })
  }

  // ── DRAFT WATERMARK
  if (inv.draftWatermark) {
    for (let pg = 1; pg <= pageCount; pg++) {
      doc.setPage(pg)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(80); doc.setTextColor('#f4b8b8')
      doc.text('DRAFT', W / 2, H / 2, { align: 'center', angle: 45 })
    }
  }

  // ── PAGE NUMBERS
  for (let pg = 1; pg <= pageCount; pg++) {
    doc.setPage(pg)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(cGy)
    doc.text(`Page ${pg} of ${pageCount}`, W / 2, H - 8, { align: 'center' })
  }

  return doc
}

export async function downloadInvoicePdf(inv: InvoiceDocument) {
  const doc = await generateInvoicePdf(inv)
  doc.save(`${inv.number || inv.type}.pdf`)
}

export async function invoicePdfBase64(inv: InvoiceDocument) {
  const doc = await generateInvoicePdf(inv)
  return doc.output('datauristring')
}
