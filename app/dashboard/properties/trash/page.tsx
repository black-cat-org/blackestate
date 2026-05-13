import { redirect } from "next/navigation"

// Legacy route. Uses 307 (temporary) so future restructuring of the trash
// UI is not pinned in browser/proxy caches.
export default function PropertiesTrashRedirect() {
  redirect("/dashboard/trash?tab=properties")
}
