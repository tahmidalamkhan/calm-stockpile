import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/lib/mock/store";
import type { Product, StockMovement } from "@/lib/types";
import { toast } from "sonner";

type StockRow = { warehouseId: string; quantity: number };

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    activeCompanyId, updateProduct, warehouses, stockMovements, addStockMovements,
  } = useCompany();
  const companyWarehouses = warehouses.filter((w) => w.companyId === activeCompanyId);
  const defaultWh =
    companyWarehouses.find((w) => w.isDefault)?.id ?? companyWarehouses[0]?.id ?? "";

  const [sku, setSku] = React.useState(product.sku);
  const [name, setName] = React.useState(product.name);
  const [category, setCategory] = React.useState(product.category);
  const [unit, setUnit] = React.useState(product.unit);
  const [price, setPrice] = React.useState(product.price);
  const [avgCost, setAvgCost] = React.useState(product.avgCost);
  const [reorderLevel, setReorderLevel] = React.useState(product.reorderLevel);
  const [stockRows, setStockRows] = React.useState<StockRow[]>([]);

  // Current quantity for this product in a given warehouse.
  const qtyAt = React.useCallback(
    (warehouseId: string) =>
      stockMovements
        .filter((m) => m.productId === product.id && m.warehouseId === warehouseId)
        .reduce((s, m) => s + m.quantity, 0),
    [stockMovements, product.id],
  );

  React.useEffect(() => {
    if (open) {
      setSku(product.sku);
      setName(product.name);
      setCategory(product.category);
      setUnit(product.unit);
      setPrice(product.price);
      setAvgCost(product.avgCost);
      setReorderLevel(product.reorderLevel);
      // Pre-fill rows with warehouses that already hold stock.
      const existing = companyWarehouses
        .map((w) => ({ warehouseId: w.id, quantity: qtyAt(w.id) }))
        .filter((r) => r.quantity > 0);
      setStockRows(existing.length ? existing : [{ warehouseId: defaultWh, quantity: 0 }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const updateRow = (idx: number, patch: Partial<StockRow>) =>
    setStockRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () =>
    setStockRows((rows) => [...rows, { warehouseId: defaultWh, quantity: 0 }]);
  const removeRow = (idx: number) =>
    setStockRows((rows) => rows.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!sku || !name) return toast.error("SKU and name are required");
    await updateProduct({
      ...product,
      sku, name, category, unit, price, avgCost, reorderLevel,
    });

    // Record adjustments where the entered quantity differs from current stock.
    const today = new Date().toISOString().slice(0, 10);
    const movements: StockMovement[] = [];
    stockRows.forEach((row) => {
      if (!row.warehouseId) return;
      const current = qtyAt(row.warehouseId);
      const target = Math.max(0, row.quantity);
      if (target !== current) {
        movements.push({
          id: "",
          companyId: activeCompanyId,
          date: today,
          productId: product.id,
          warehouseId: row.warehouseId,
          type: "adjustment",
          quantity: target - current,
          unitCost: avgCost,
          reference: "EDIT",
          fromQty: current,
          toQty: target,
        });
      }
    });
    if (movements.length) await addStockMovements(movements);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Unit</Label><Input value={unit} placeholder="e.g. pcs, kg, box" onChange={(e) => setUnit(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Avg cost</Label><Input type="number" min={0} step="0.01" value={avgCost || ""} onChange={(e) => setAvgCost(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Price</Label><Input type="number" min={0} step="0.01" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Reorder level</Label><Input type="number" min={0} value={reorderLevel || ""} onChange={(e) => setReorderLevel(Number(e.target.value))} /></div>
        </div>

        <div className="mt-2 border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <Label>Quantity by warehouse</Label>
            <Button type="button" size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-1 h-3 w-3" /> Add row
            </Button>
          </div>
          <div className="grid gap-2">
            {stockRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_140px_auto] gap-2">
                <Select
                  value={row.warehouseId}
                  onValueChange={(v) => updateRow(idx, { warehouseId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Warehouse" /></SelectTrigger>
                  <SelectContent>
                    {companyWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  placeholder="Quantity"
                  value={row.quantity || ""}
                  onChange={(e) =>
                    updateRow(idx, { quantity: Math.max(0, Number(e.target.value)) })
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRow(idx)}
                  disabled={stockRows.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Changing a quantity records an adjustment in stock movements.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
