"use client"

import { forwardRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">

// Uses forwardRef so react-hook-form's `<FormField>` ref (spread via
// `{...field}`) reaches the underlying `<input>` DOM element. Without this,
// RHF's default `shouldFocusError` cannot auto-focus an invalid password on
// submit, breaking keyboard/screen-reader flows.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ id, ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="size-4 text-muted-foreground" />
          ) : (
            <Eye className="size-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    )
  }
)
