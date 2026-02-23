export function LandingFooter() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Black Estate. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
