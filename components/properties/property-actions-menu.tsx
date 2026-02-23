"use client"

import { MoreHorizontal, Eye, Pencil, Copy, Pause, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { Property } from "@/lib/types/property"

export function PropertyActionsMenu({ property }: { property: Property }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/properties/${property.id}`}>
            <Eye className="text-muted-foreground" />
            Ver detalle
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Pencil className="text-muted-foreground" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Copy className="text-muted-foreground" />
          Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Pause className="text-muted-foreground" />
          Pausar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-destructive">
          <Trash2 className="text-muted-foreground" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
