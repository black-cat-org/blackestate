"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InquiryActionsMenu } from "./inquiry-actions-menu"
import { InquirySourceBadge } from "./inquiry-source-badge"
import { InquiryStatusBadge } from "./inquiry-status-badge"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export const inquiryColumns: ColumnDef<Inquiry>[] = [
  {
    accessorKey: "contactName",
    header: "Contacto",
    cell: ({ row }) => {
      const inquiry = row.original
      return (
        <Link
          href={`/dashboard/inquiries/${inquiry.id}`}
          className="font-medium hover:underline"
        >
          {inquiry.contactName ?? <span className="text-muted-foreground">—</span>}
        </Link>
      )
    },
  },
  {
    accessorKey: "propertyTitle",
    header: "Propiedad",
    cell: ({ row }) => {
      const title = row.original.propertyTitle
      return title ? (
        <Link
          href={`/dashboard/properties/${row.original.propertyId}`}
          className="max-w-[200px] truncate text-xs hover:underline block"
          title={title}
        >
          {title}
        </Link>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      )
    },
  },
  {
    accessorKey: "source",
    header: "Origen",
    cell: ({ row }) => {
      const source = row.original.source
      return source ? (
        <InquirySourceBadge source={source} />
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <InquiryStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => dateFormatter.format(new Date(row.original.createdAt)),
  },
  {
    id: "actions",
    cell: ({ row }) => <InquiryActionsMenu inquiry={row.original} />,
  },
]
