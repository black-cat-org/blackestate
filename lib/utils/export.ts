import jsPDF from "jspdf"
import * as XLSX from "xlsx"

interface ExportData {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(data.title, 14, 20)
  doc.setFontSize(10)

  let y = 35
  const colWidth = (doc.internal.pageSize.width - 28) / data.headers.length

  // Headers
  data.headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold")
    doc.text(h, 14 + i * colWidth, y)
  })
  y += 8

  // Rows
  doc.setFont("helvetica", "normal")
  for (const row of data.rows) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    row.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * colWidth, y)
    })
    y += 6
  }

  doc.save(`${data.title.toLowerCase().replace(/\s+/g, "-")}.pdf`)
}

export function exportToExcel(data: ExportData) {
  const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, data.title.slice(0, 31))
  XLSX.writeFile(wb, `${data.title.toLowerCase().replace(/\s+/g, "-")}.xlsx`)
}
