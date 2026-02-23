"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyStatusBadge } from "./property-status-badge"
import { PropertyActionsMenu } from "./property-actions-menu"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { formatPrice } from "@/lib/utils/format"
import type { Property } from "@/lib/types/property"

export const propertyColumns: ColumnDef<Property>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Título
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/dashboard/properties/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.getValue("title")}
      </Link>
    ),
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => PROPERTY_TYPE_LABELS[row.original.type],
  },
  {
    accessorKey: "operationType",
    header: "Operación",
    cell: ({ row }) => OPERATION_TYPE_LABELS[row.original.operationType],
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Precio
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => formatPrice(row.original.price),
    sortingFn: (rowA, rowB) =>
      rowA.original.price.amount - rowB.original.price.amount,
  },
  {
    accessorKey: "address.city",
    header: "Ciudad",
    cell: ({ row }) => row.original.address.city,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <PropertyStatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <PropertyActionsMenu property={row.original} />,
  },
]
