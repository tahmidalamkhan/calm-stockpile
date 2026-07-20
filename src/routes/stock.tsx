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
import { StockAdjustmentDialog } from "@/components/app/StockAdjustmentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { useState } from "react";
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

  // Running per-(product, warehouse) balance keyed by movement id.
  const balances = new Map<string, { initial: number; final: number }>();
  {
    const groups = new Map<string, typeof ms>();
    for (const m of ms) {
      const key = `${m.productId}|${m.warehouseId}`;
      const arr = groups.get(key) ?? [];
      arr.push(m);
      groups.set(key, arr);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1));
      let running = 0;
      for (const m of arr) {
        const initial = running;
        running += m.quantity;
        balances.set(m.id, { initial, final: running });
      }
    }
  }
  const qtyCols = (m: (typeof ms)[number]) => {
    if (m.type === "adjustment" && m.fromQty !== undefined && m.toQty !== undefined) {
      return { initial: m.fromQty, final: m.toQty };
    }
    return balances.get(m.id) ?? { initial: 0, final: 0 };
  };


  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filteredForExport = visibleMovements.filter((m) => {
    if (fromDate && m.date < fromDate) return false;
    if (toDate && m.date > toDate) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Stock Control"
        description="On-hand by warehouse, transfers, and movement history"
        actions={
          <div className="flex flex-wrap gap-2">
            <StockAdjustDialog direction="in" />
            <StockAdjustDialog direction="out" />
            <StockAdjustmentDialog />
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
        <CardHeader className="flex flex-col items-stretch gap-3 space-y-0 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Stock movements</CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-40" />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredForExport.length === 0}
              onClick={() => {
                const rows = filteredForExport.map((m) => {
                  const { initial, final } = qtyCols(m);
                  return {
                    Date: m.date,
                    Reference: m.reference,
                    Product: ps.find((p) => p.id === m.productId)?.name ?? m.productId,
                    Warehouse: warehouseLabel(m),
                    Type: m.type,
                    "Initial Qty": initial,
                    "Final Qty": final,
                    "Unit cost": m.unitCost,
                  };
                });

                const suffix = fromDate || toDate ? `_${fromDate || "all"}_to_${toDate || "all"}` : "";
                exportRowsToXlsx(rows, `stock-movements${suffix}.xlsx`, "Movements");
              }}
            >
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </div>
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
                <TableHead className="text-right">Initial Qty</TableHead>
                <TableHead className="text-right">Final Qty</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMovements.map((m) => {
                const { initial, final } = qtyCols(m);
                return (
                  <TableRow key={m.id}>
                    <TableCell>{formatDate(m.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                    <TableCell>{ps.find((p) => p.id === m.productId)?.name}</TableCell>
                    <TableCell>{warehouseLabel(m)}</TableCell>
                    <TableCell>
                      <Badge variant={m.quantity >= 0 ? "default" : "secondary"}>{m.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{initial}</TableCell>
                    <TableCell className="text-right font-mono">{final}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(m.unitCost)}</TableCell>
                  </TableRow>
                );
              })}

            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
