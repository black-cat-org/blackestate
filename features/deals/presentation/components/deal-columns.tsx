"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DealActionsMenu } from "./deal-actions-menu"
import { DealStageBadge } from "./deal-stage-badge"
import { DEAL_SOURCE_LABELS } from "@/lib/constants/deal"
import type { Deal } from "@/features/deals/domain/deal.entity"

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export const dealColumns: ColumnDef<Deal>[] = [
  {
    accessorKey: "contactName",
    header: "Contacto",
    cell: ({ row }) => {
      const deal = row.original
      return (
        <Link
          href={`/dashboard/deals/${deal.id}`}
          className="font-medium hover:underline"
        >
          {deal.contactName ?? (
            <span className="text-muted-foreground">—</span>
          )}
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
          className="block max-w-[200px] truncate text-xs hover:underline"
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
    accessorKey: "stage",
    header: "Etapa",
    cell: ({ row }) => <DealStageBadge stage={row.original.stage} />,
  },
  {
    accessorKey: "source",
    header: "Origen",
    cell: ({ row }) => {
      const source = row.original.source
      return source ? (
        <Badge variant="secondary" className="text-xs">
          {DEAL_SOURCE_LABELS[source]}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: "expectedCloseAt",
    header: "Cierre estimado",
    cell: ({ row }) => {
      const value = row.original.expectedCloseAt
      return value ? (
        <span className="text-xs">{dateFormatter.format(new Date(value))}</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      )
    },
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
    cell: ({ row }) => <DealActionsMenu deal={row.original} />,
  },
]
