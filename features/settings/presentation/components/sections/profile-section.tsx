"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { useDropzone, type FileRejection } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateAgentProfileAction } from "@/features/settings/presentation/actions"
import { uploadAvatarAction } from "@/features/properties/presentation/storage-actions"
import { toast } from "sonner"
import type { AgentProfile } from "@/features/settings/domain/settings.entity"

interface ProfileSectionProps {
  data: AgentProfile
}

export function ProfileSection({ data: initialData }: ProfileSectionProps) {
  const [data, setData] = useState<AgentProfile>(initialData)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  function update<K extends keyof AgentProfile>(field: K, value: AgentProfile[K]) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const uploadAvatar = useCallback(
    async (file: File) => {
      setUploadingAvatar(true)
      try {
        const formData = new FormData()
        formData.set("file", file)
        if (data.avatar) {
          formData.set("previousAvatarUrl", data.avatar)
        }
        const url = await uploadAvatarAction(formData)
        setData((prev) => ({ ...prev, avatar: url }))
        toast.success("Foto actualizada")
      } catch (error) {
        console.error("[avatar] upload failed", error)
        toast.error("Error al subir la foto")
      } finally {
        setUploadingAvatar(false)
      }
    },
    [data.avatar],
  )

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const error = fileRejections[0].errors[0]
        if (error.code === "file-too-large") {
          toast.error("La imagen debe pesar menos de 2MB")
        } else if (error.code === "file-invalid-type") {
          toast.error("Formato no soportado. Usá JPG, PNG o WEBP")
        } else {
          toast.error("Archivo inválido")
        }
        return
      }
      const file = acceptedFiles[0]
      if (file) uploadAvatar(file)
    },
    [uploadAvatar],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 2 * 1024 * 1024,
    multiple: false,
    maxFiles: 1,
    disabled: uploadingAvatar,
  })

  async function handleSave() {
    setSaving(true)
    try {
      await updateAgentProfileAction(data)
      toast.success("Configuración guardada")
    } catch {
      toast.error("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  const initials = data.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Perfil</h3>
        <p className="text-sm text-muted-foreground">Información personal y de contacto</p>
      </div>

      {/* Avatar */}
      <Card
        {...getRootProps()}
        className={cn(
          "cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          uploadingAvatar && "cursor-wait opacity-70",
        )}
      >
        <input {...getInputProps()} />
        <CardContent className="flex items-center gap-4 p-4!">
          <div className="relative size-16 shrink-0">
            {data.avatar ? (
              <div className="size-16 rounded-full overflow-hidden relative">
                <Image
                  src={data.avatar}
                  alt={data.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                {initials}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{data.name}</p>
            <p className="text-xs text-muted-foreground truncate">{data.email}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {isDragActive
                ? "Soltá la foto aquí"
                : uploadingAvatar
                  ? "Subiendo..."
                  : "Arrastra una foto o hacé click para cambiarla"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

        {/* Personal info */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Información personal</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={data.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={data.bio} onChange={(e) => update("bio", e.target.value)} rows={3} />
              <p className="text-xs text-muted-foreground">Se muestra en brochures y landing pages de tus propiedades</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Sitio web</Label>
              <Input id="website" value={data.website} onChange={(e) => update("website", e.target.value)} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Contact */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Contacto</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={data.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value)}
                placeholder="+591 ..."
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Se usa para que tus clientes te contacten desde las landing pages y brochures. El email de arriba se usa para el mismo fin.</p>
        </div>

        <Separator />

        {/* Social */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Redes sociales</h4>
            <p className="text-xs text-muted-foreground">Se usan en las landing pages y materiales de marketing de tus propiedades</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={data.instagram}
                onChange={(e) => update("instagram", e.target.value)}
                placeholder="@usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={data.facebook}
                onChange={(e) => update("facebook", e.target.value)}
                placeholder="Nombre de página"
              />
            </div>
          </div>
        </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
