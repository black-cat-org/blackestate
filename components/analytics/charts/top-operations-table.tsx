import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { FinancialOperation } from "@/lib/types/analytics"

interface TopOperationsTableProps {
  data: FinancialOperation[]
}

export function TopOperationsTable({ data }: TopOperationsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top operaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propiedad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Comisión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="font-medium">{op.propertyTitle}</TableCell>
                <TableCell>{op.operationType}</TableCell>
                <TableCell className="text-right">US$ {op.propertyValue.toLocaleString()}</TableCell>
                <TableCell className="text-right">US$ {op.commission.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
