import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
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
import { EditProductDialog } from "@/components/app/EditProductDialog";
import type { Product } from "@/lib/types";

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
  const { activeCompanyId, products, stockMovements, warehouses, deleteProduct, updateProduct } = useCompany();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const savePrice = async (p: Product, raw: string) => {
    const next = Math.max(0, Number(raw));
    setDrafts((d) => { const { [p.id]: _drop, ...rest } = d; return rest; });
    if (!Number.isFinite(next) || next === p.price) return;
    await updateProduct({ ...p, price: next });
  };
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

  const totalUnitPrice = list.reduce((s, p) => s + p.price, 0);
  const totalInventoryValue = list.reduce((s, p) => s + p.price * onHand(p.id), 0);

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
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode((v) => !v)}
            >
              {editMode ? "Done editing" : "Edit mode"}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Warehouses</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead className="w-12"></TableHead>
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
                    <TableCell className="text-muted-foreground">{p.unit}</TableCell>
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
                    <TableCell className="text-right font-mono">
                      {editMode ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8 w-28 text-right font-mono"
                          value={drafts[p.id] ?? String(p.price ?? "")}
                          onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          onBlur={(e) => void savePrice(p, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        />
                      ) : (
                        formatCurrency(p.price)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {low ? (
                        <Badge variant="destructive">{qty}</Badge>
                      ) : (
                        <span>{qty}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.reorderLevel}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing(p)}
                      >
                        <Pencil />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete <span className="font-medium">{p.name}</span> ({p.sku})
                              and all of its stock movement history. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => void deleteProduct(p.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="font-medium">Totals</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totalUnitPrice)}</TableCell>
                <TableCell colSpan={3} className="text-right">
                  <span className="text-muted-foreground">Total inventory value: </span>
                  <span className="font-mono font-medium">{formatCurrency(totalInventoryValue)}</span>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditProductDialog
          product={editing}
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}
    </>
  );
}
