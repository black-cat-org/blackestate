import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PropertyRanking } from "@/lib/types/analytics"

interface TopPropertiesTableProps {
  data: PropertyRanking[]
}

export function TopPropertiesTable({ data }: TopPropertiesTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Propiedades con más interacción</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propiedad</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Visitas</TableHead>
              <TableHead className="text-right">Citas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-right">{item.leads}</TableCell>
                <TableCell className="text-right">{item.visits}</TableCell>
                <TableCell className="text-right">{item.appointments}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
