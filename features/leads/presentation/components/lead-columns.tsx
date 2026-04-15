"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LeadStatusBadge } from "./lead-status-badge"
import { LeadSourceBadge } from "./lead-source-badge"
import { LeadActionsMenu } from "./lead-actions-menu"
import type { Lead } from "@/features/leads/domain/lead.entity"

export const leadColumns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nombre
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/dashboard/leads/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "propertyTitle",
    header: "Propiedad",
    cell: ({ row }) => {
      const title = row.original.propertyTitle
      return title ? (
        <Link
          href={`/dashboard/properties/${row.original.propertyId}`}
          className="max-w-[150px] truncate text-xs hover:underline block"
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
    header: "Fuente",
    cell: ({ row }) => <LeadSourceBadge source={row.original.source} />,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <LeadStatusBadge status={row.original.status} />,
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
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt)
      return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <LeadActionsMenu lead={row.original} />,
  },
]
