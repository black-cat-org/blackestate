"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { searchContactsAction } from "@/features/contacts/presentation/actions"
import type { Contact } from "@/features/contacts/domain/contact.entity"

interface ContactAutocompleteProps {
  /**
   * Currently selected Contact, when the caller is operating in
   * controlled mode. The component renders the trigger label off
   * this value.
   */
  value?: Contact
  /**
   * Fired when the agent picks an existing Contact from the dropdown.
   * The caller is responsible for storing the selection (e.g. as the
   * Deal-creation form's `contactId`).
   */
  onSelect: (contact: Contact) => void
  /**
   * Fired when the agent clicks "Crear nuevo contacto" with the
   * current query. The caller is expected to open
   * {@link ContactEditDialog} in create mode prefilled with the query
   * and, on success, call `onSelect` with the newly created Contact.
   *
   * Only invoked when the agent has typed at least one non-whitespace
   * character — the empty-query case shows an empty-state hint instead
   * of a create row, to prevent accidental no-query create dialogs.
   * Omitting this prop hides the inline-create row entirely (useful
   * for screens where the agent must pick an existing Contact, e.g.
   * inquiry reassignment).
   */
  onRequestCreate?: (query: string) => void
  placeholder?: string
  /** Disables the trigger and dropdown. */
  disabled?: boolean
  /** Override the default debounce window for the search query. */
  debounceMs?: number
}

const DEFAULT_DEBOUNCE_MS = 250
const SEARCH_LIMIT = 10

function formatSecondaryLine(contact: Contact): string | undefined {
  if (contact.phone && contact.email) return `${contact.phone} · ${contact.email}`
  return contact.phone ?? contact.email
}

export function ContactAutocomplete({
  value,
  onSelect,
  onRequestCreate,
  placeholder = "Buscar contacto…",
  disabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: ContactAutocompleteProps) {
  const triggerId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Contact[]>([])
  const [isPending, startTransition] = useTransition()
  const [searchError, setSearchError] = useState(false)

  // Monotonic sequence number — every search bump increments it; only
  // the response whose `seq` still matches the latest value is allowed
  // to write into `results`. Prevents the classic "fast typist sees
  // stale older response clobber newer one" race. Survives across
  // unmount/remount via a ref (the cleanup discards any in-flight
  // sequence that has not yet resolved).
  const searchSeqRef = useRef(0)

  // Debounced search. Each query change schedules a server action;
  // the cleanup cancels the timer when the query changes again before
  // it fires. Empty queries skip the network entirely.
  const trimmedQuery = query.trim()

  useEffect(() => {
    if (!open) return

    if (trimmedQuery.length === 0) {
      setResults([])
      setSearchError(false)
      return
    }

    const seq = ++searchSeqRef.current

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const found = await searchContactsAction(trimmedQuery, {
            limit: SEARCH_LIMIT,
          })
          if (seq !== searchSeqRef.current) return
          setResults(found)
          setSearchError(false)
        } catch {
          if (seq !== searchSeqRef.current) return
          setResults([])
          setSearchError(true)
        }
      })
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [trimmedQuery, open, debounceMs])

  const handleSelect = (contact: Contact) => {
    onSelect(contact)
    setOpen(false)
    setQuery("")
  }

  const handleCreate = () => {
    if (!onRequestCreate || trimmedQuery.length === 0) return
    onRequestCreate(trimmedQuery)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? value.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre, teléfono o correo…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isPending && (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Buscando…
              </div>
            )}

            {!isPending && searchError && (
              <CommandEmpty>No se pudo buscar. Intenta de nuevo.</CommandEmpty>
            )}

            {!isPending && !searchError && trimmedQuery.length === 0 && (
              <CommandEmpty>Empieza a escribir para buscar contactos.</CommandEmpty>
            )}

            {!isPending &&
              !searchError &&
              trimmedQuery.length > 0 &&
              results.length === 0 && <CommandEmpty>Sin resultados.</CommandEmpty>}

            {results.length > 0 && (
              <CommandGroup heading="Contactos">
                {results.map((contact) => {
                  const secondary = formatSecondaryLine(contact)
                  const isSelected = value?.id === contact.id
                  return (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => handleSelect(contact)}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{contact.name}</span>
                        {secondary && (
                          <span className="text-muted-foreground text-xs">
                            {secondary}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {onRequestCreate && trimmedQuery.length > 0 && !isPending && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleCreate}>
                    <Plus className="size-4" />
                    Crear nuevo contacto
                    <span className="text-muted-foreground ml-1 truncate">
                      “{trimmedQuery}”
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
