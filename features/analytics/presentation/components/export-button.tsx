"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { exportToPDF, exportToExcel } from "@/lib/utils/export"

interface ExportButtonProps {
  getExportData: () => { title: string; headers: string[]; rows: (string | number)[][] }
}

export function ExportButton({ getExportData }: ExportButtonProps) {
  const handleExportPDF = () => {
    const data = getExportData()
    exportToPDF(data)
  }

  const handleExportExcel = () => {
    const data = getExportData()
    exportToExcel(data)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 size-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="mr-2 size-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-2 size-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
