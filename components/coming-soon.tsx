import { Construction } from "lucide-react"

interface ComingSoonProps {
  title: string
  description: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Construction className="size-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>
      </div>
    </div>
  )
}
