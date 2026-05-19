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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportRowsToXlsx } from "@/lib/export-xlsx";

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

  const warehouseName = (id: string) => ws.find((w) => w.id === id)?.name ?? "—";
  const warehouseLabel = (m: (typeof ms)[number]) => {
    if (m.type !== "transfer") return warehouseName(m.warehouseId);
    const pair = ms.find(
      (x) =>
        x.id !== m.id &&
        x.reference === m.reference &&
        x.productId === m.productId &&
        x.type === "transfer" &&
        Math.sign(x.quantity) !== Math.sign(m.quantity),
    );
    const fromId = m.quantity < 0 ? m.warehouseId : pair?.warehouseId;
    const toId = m.quantity > 0 ? m.warehouseId : pair?.warehouseId;
    return `${warehouseName(fromId ?? "")} → ${warehouseName(toId ?? "")}`;
  };
  const visibleMovements = ms.filter(
    (m) => !(m.type === "transfer" && m.quantity < 0),
  );

  return (
    <>
      <PageHeader
        title="Stock Control"
        description="On-hand by warehouse, transfers, and movement history"
        actions={
          <div className="flex flex-wrap gap-2">
            <StockAdjustDialog direction="in" />
            <StockAdjustDialog direction="out" />
            <TransferStockDialog />
          </div>
        }
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
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Stock movements</CardTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={visibleMovements.length === 0}
            onClick={() => {
              const rows = visibleMovements.map((m) => ({
                Date: m.date,
                Reference: m.reference,
                Product: ps.find((p) => p.id === m.productId)?.name ?? m.productId,
                Warehouse: warehouseLabel(m),
                Type: m.type,
                Quantity: Math.abs(m.quantity),
                "Unit cost": m.unitCost,
              }));
              exportRowsToXlsx(rows, "stock-movements.xlsx", "Movements");
            }}
          >
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
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
              {visibleMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDate(m.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                  <TableCell>{ps.find((p) => p.id === m.productId)?.name}</TableCell>
                  <TableCell>{warehouseLabel(m)}</TableCell>
                  <TableCell>
                    <Badge variant={m.quantity >= 0 ? "default" : "secondary"}>{m.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{Math.abs(m.quantity)}</TableCell>
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
