import { jsPDF } from 'jspdf'
import autoTable, { type UserOptions } from 'jspdf-autotable'
import { APP_NAME, HOSPITAL_NAME } from '@/constants'
import { formatDate } from '@/utils'

export const PDF_MARGIN = 16

export type PdfPreparedBy = {
  displayName: string
  role: string
}

export interface HospitalPdfMeta {
  title: string
  subject?: string
  keywords?: string
}

/**
 * Shared hospital PDF chrome used by Stock In, Allocation, and Transfer reports.
 */
export function createHospitalPdf(reportTitle: string, meta?: HospitalPdfMeta) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_MARGIN

  doc.setProperties({
    title: meta?.title ?? `${HOSPITAL_NAME}: ${reportTitle}`,
    subject: meta?.subject ?? `${APP_NAME} hospital inventory report`,
    author: HOSPITAL_NAME,
    keywords: meta?.keywords ?? 'HealthPlus, inventory, pharmacy, report',
    creator: `${HOSPITAL_NAME} ${APP_NAME}`,
  })

  doc.setFillColor(196, 30, 58)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(HOSPITAL_NAME, margin, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(APP_NAME, margin, 19)
  doc.setFontSize(11)
  doc.text(reportTitle, pageWidth - margin, 16, { align: 'right' })

  return { doc, pageWidth, margin }
}

export function drawSectionTitle(doc: jsPDF, title: string, y = 40) {
  const margin = PDF_MARGIN
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setTextColor(28, 31, 38)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin, y)
  doc.setDrawColor(226, 224, 221)
  doc.line(margin, y + 2, pageWidth - margin, y + 2)
}

/** Two-column meta pairs: [label, value] */
export function drawMetaGrid(
  doc: jsPDF,
  pairs: Array<[string, string]>,
  startY = 50,
): number {
  const margin = PDF_MARGIN
  const colGap = 95
  let y = startY

  for (let i = 0; i < pairs.length; i += 2) {
    const left = pairs[i]!
    const right = pairs[i + 1]

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.text(left[0], margin, y)
    if (right) doc.text(right[0], margin + colGap, y)

    doc.setTextColor(28, 31, 38)
    doc.setFont('helvetica', 'bold')
    doc.text(left[1] || '-', margin, y + 6)
    if (right) doc.text(right[1] || '-', margin + colGap, y + 6)

    y += 16
  }

  return y
}

export function drawDataTable(
  doc: jsPDF,
  options: {
    startY: number
    head: string[]
    body: Array<Array<string | number>>
    columnStyles?: UserOptions['columnStyles']
  },
): number {
  const margin = PDF_MARGIN
  autoTable(doc, {
    startY: options.startY,
    head: [options.head],
    body: options.body,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [28, 31, 38],
      lineColor: [226, 224, 221],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [22, 25, 31],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [246, 245, 244],
    },
    columnStyles: options.columnStyles,
    margin: { left: margin, right: margin },
  })

  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? options.startY
}

export function drawGrandTotal(
  doc: jsPDF,
  label: string,
  value: string,
  afterY: number,
): number {
  const margin = PDF_MARGIN
  const pageWidth = doc.internal.pageSize.getWidth()
  const y = afterY + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(28, 31, 38)
  doc.text(label, pageWidth - margin - 55, y)
  doc.setTextColor(196, 30, 58)
  doc.text(value, pageWidth - margin, y, { align: 'right' })
  return y
}

export function drawPreparedFooter(
  doc: jsPDF,
  preparedBy: PdfPreparedBy,
  afterY: number,
): void {
  const margin = PDF_MARGIN
  const pageWidth = doc.internal.pageSize.getWidth()
  const footerY = Math.max(afterY + 24, 250)

  doc.setDrawColor(226, 224, 221)
  doc.line(margin, footerY, pageWidth - margin, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('Prepared By', margin, footerY + 8)
  doc.text('Generated Date', margin + 95, footerY + 8)

  doc.setTextColor(28, 31, 38)
  doc.setFont('helvetica', 'bold')
  doc.text(`${preparedBy.displayName} (${preparedBy.role})`, margin, footerY + 14)
  doc.text(formatDate(new Date().toISOString(), 'dd MMM yyyy, HH:mm'), margin + 95, footerY + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(160, 167, 181)
  doc.text(`${HOSPITAL_NAME} · ${APP_NAME} · Confidential hospital record`, margin, 290)
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function safeFilenamePart(value: string): string {
  return value.replace(/[^\w-]+/g, '_')
}
