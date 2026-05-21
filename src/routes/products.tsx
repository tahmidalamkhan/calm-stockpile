import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCompany } from "@/lib/mock/store";
import { formatCurrency } from "@/lib/format";
import { NewProductDialog } from "@/components/app/NewProductDialog";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — StockHub" },
      { name: "description", content: "Catalog of inventory products with cost, price, and on-hand quantity." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { activeCompanyId, products, stockMovements, warehouses, deleteProduct } = useCompany();
  const [query, setQuery] = React.useState("");
  const all = products.filter((p) => p.companyId === activeCompanyId);
  const q = query.trim().toLowerCase();
  const list = q
    ? all.filter(
        (p) => p.name.toLowerCase().startsWith(q) || p.sku.toLowerCase().startsWith(q),
      )
    : all;
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);

  const qtyAt = (productId: string, warehouseId: string) =>
    stockMovements
      .filter((m) => m.productId === productId && m.warehouseId === warehouseId)
      .reduce((s, m) => s + m.quantity, 0);

  const onHand = (productId: string) =>
    stockMovements.filter((m) => m.productId === productId).reduce((s, m) => s + m.quantity, 0);

  const warehousesFor = (productId: string) =>
    ws
      .map((w) => ({ w, qty: qtyAt(productId, w.id) }))
      .filter((x) => x.qty > 0);

  return (
    <>
      <PageHeader
        title="Products"
        description="Inventory items with weighted average cost"
        actions={<NewProductDialog />}
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Input
              placeholder="Search SKU or name…"
              className="max-w-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Warehouses</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const qty = onHand(p.id);
                const low = qty <= p.reorderLevel;
                const locations = warehousesFor(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>
                      {locations.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {locations.map(({ w, qty: q }) => (
                            <Badge key={w.id} variant="secondary" className="font-normal">
                              {w.name}: <span className="ml-1 font-mono">{q}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.avgCost)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.price)}</TableCell>
                    <TableCell className="text-right">
                      {low ? (
                        <Badge variant="destructive">{qty}</Badge>
                      ) : (
                        <span>{qty}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.reorderLevel}</TableCell>
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
