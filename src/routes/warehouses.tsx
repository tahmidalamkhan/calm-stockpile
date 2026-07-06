import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Star } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCompany } from "@/lib/mock/store";
import { NewWarehouseDialog } from "@/components/app/NewWarehouseDialog";
import { BulkStockImportDialog } from "@/components/app/BulkStockImportDialog";
import { formatCurrency } from "@/lib/format";
import { exportRowsToXlsx } from "@/lib/export-xlsx";

export const Route = createFileRoute("/warehouses")({
  head: () => ({
    meta: [
      { title: "Warehouses — StockHub" },
      { name: "description", content: "Manage warehouse locations and view products held in each." },
    ],
  }),
  component: WarehousesPage,
});

function WarehousesPage() {
  const { activeCompanyId, warehouses, products, stockMovements, deleteWarehouse, setDefaultWarehouse } = useCompany();
  const list = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ps = products.filter((p) => p.companyId === activeCompanyId);

  const [selectedId, setSelectedId] = React.useState<string>(
    list.find((w) => w.isDefault)?.id ?? list[0]?.id ?? "",
  );

  React.useEffect(() => {
    if (!list.find((w) => w.id === selectedId)) {
      setSelectedId(list.find((w) => w.isDefault)?.id ?? list[0]?.id ?? "");
    }
  }, [activeCompanyId, list, selectedId]);

  const qtyAt = (productId: string, warehouseId: string) =>
    stockMovements
      .filter((m) => m.productId === productId && m.warehouseId === warehouseId)
      .reduce((s, m) => s + m.quantity, 0);

  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const productsInWarehouse = ps
    .map((p) => ({ p, qty: qtyAt(p.id, selectedId) }))
    .filter((x) => x.qty > 0)
    .filter(({ p }) =>
      q ? p.name.toLowerCase().startsWith(q) || p.sku.toLowerCase().startsWith(q) : true,
    );

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Locations where inventory is stored"
        actions={
          <div className="flex gap-2">
            <BulkStockImportDialog initialWarehouseId={selectedId} />
            <NewWarehouseDialog />
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs">{w.code}</TableCell>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.address}</TableCell>
                  <TableCell>{w.isDefault && <Badge>Default</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes “{w.name}” and all its stock movements. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void deleteWarehouse(w.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Products in warehouse</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search SKU or name…"
              className="w-[220px]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Label className="text-sm text-muted-foreground">Warehouse</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {list.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={productsInWarehouse.length === 0}
              onClick={() => {
                const wh = list.find((w) => w.id === selectedId);
                const rows = productsInWarehouse.map(({ p, qty }) => ({
                  SKU: p.sku,
                  Name: p.name,
                  Category: p.category,
                  Unit: p.unit,
                  Quantity: qty,
                  "Avg cost": p.avgCost,
                  "Stock value": qty * p.avgCost,
                }));
                const safe = (wh?.name ?? "warehouse").replace(/[^\w-]+/g, "_");
                exportRowsToXlsx(rows, `stock-${safe}.xlsx`, wh?.name ?? "Stock");
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
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Stock value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsInWarehouse.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No stock in this warehouse yet.
                  </TableCell>
                </TableRow>
              ) : (
                productsInWarehouse.map(({ p, qty }) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="text-right font-mono">{qty}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.avgCost)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(qty * p.avgCost)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
