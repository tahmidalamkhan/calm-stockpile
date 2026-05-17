import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/lib/mock/store";
import { formatDate, formatCurrency } from "@/lib/format";
import { TransferStockDialog } from "@/components/app/TransferStockDialog";
import { StockAdjustDialog } from "@/components/app/StockAdjustDialog";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Stock Control — StockHub" },
      { name: "description", content: "On-hand stock by warehouse and full movement history." },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const { activeCompanyId, products, warehouses, stockMovements } = useCompany();
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ps = products.filter((p) => p.companyId === activeCompanyId);
  const ms = stockMovements.filter((m) => m.companyId === activeCompanyId);

  const qty = (productId: string, warehouseId: string) =>
    ms
      .filter((m) => m.productId === productId && m.warehouseId === warehouseId)
      .reduce((s, m) => s + m.quantity, 0);

  return (
    <>
      <PageHeader
        title="Stock Control"
        description="On-hand by warehouse, transfers, and movement history"
        actions={<TransferStockDialog />}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>On-hand by warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                {ws.map((w) => (
                  <TableHead key={w.id} className="text-right">
                    {w.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ps.map((p) => {
                const total = ws.reduce((s, w) => s + qty(p.id, w.id), 0);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    {ws.map((w) => (
                      <TableCell key={w.id} className="text-right">
                        {qty(p.id, w.id)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold">{total}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock movements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ms.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDate(m.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                  <TableCell>{ps.find((p) => p.id === m.productId)?.name}</TableCell>
                  <TableCell>{ws.find((w) => w.id === m.warehouseId)?.name}</TableCell>
                  <TableCell>
                    <Badge variant={m.quantity >= 0 ? "default" : "secondary"}>{m.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(m.unitCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
