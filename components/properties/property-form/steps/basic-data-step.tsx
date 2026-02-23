"use client"

import { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  CURRENCY_LABELS,
} from "@/lib/constants/property"
import type { PropertyFormData } from "@/lib/types/property"

export function BasicDataStep({ form }: { form: UseFormReturn<PropertyFormData> }) {
  const { register, formState: { errors }, setValue, watch } = form

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Datos básicos</h2>

      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...register("title")} placeholder="Ej: Casa moderna en Palermo" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción *</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe la propiedad..."
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de propiedad *</Label>
          <Select value={watch("type")} onValueChange={(v) => setValue("type", v as PropertyFormData["type"], { shouldValidate: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Tipo de operación *</Label>
          <Select
            value={watch("operationType")}
            onValueChange={(v) => setValue("operationType", v as PropertyFormData["operationType"], { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar operación" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.operationType && (
            <p className="text-sm text-destructive">{errors.operationType.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Precio *</Label>
          <div className="flex gap-2">
            <Input
              id="price"
              type="number"
              {...register("price")}
              placeholder="0"
              className="flex-1"
            />
            <Select
              value={watch("currency")}
              onValueChange={(v) => setValue("currency", v as PropertyFormData["currency"])}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expenses">Expensas</Label>
          <div className="flex gap-2">
            <Input
              id="expenses"
              type="number"
              {...register("expenses")}
              placeholder="0"
              className="flex-1"
            />
            <Select
              value={watch("expensesCurrency")}
              onValueChange={(v) => setValue("expensesCurrency", v as PropertyFormData["expensesCurrency"])}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
