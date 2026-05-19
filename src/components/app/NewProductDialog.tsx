import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/lib/mock/store";
import { toast } from "sonner";

type StockRow = { warehouseId: string; quantity: number };

export function NewProductDialog() {
  const { activeCompanyId, addProduct, warehouses } = useCompany();
  const companyWarehouses = warehouses.filter((w) => w.companyId === activeCompanyId);
  const defaultWh =
    companyWarehouses.find((w) => w.isDefault)?.id ?? companyWarehouses[0]?.id ?? "";

  const [open, setOpen] = React.useState(false);
  const [sku, setSku] = React.useState("");
  const [skuEdited, setSkuEdited] = React.useState(false);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [unit, setUnit] = React.useState("pcs");
  const [price, setPrice] = React.useState(0);
  const [avgCost, setAvgCost] = React.useState(0);
  const [reorderLevel, setReorderLevel] = React.useState(0);
  const [stockRows, setStockRows] = React.useState<StockRow[]>([
    { warehouseId: defaultWh, quantity: 0 },
  ]);

  React.useEffect(() => {
    setStockRows([{ warehouseId: defaultWh, quantity: 0 }]);
  }, [defaultWh]);

  const generateSku = (n: string) => {
    const base = n
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 4);
    if (!base) return "";
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${base}-${rand}`;
  };

  const onNameChange = (v: string) => {
    setName(v);
    if (!skuEdited) setSku(generateSku(v));
  };

  const updateRow = (idx: number, patch: Partial<StockRow>) =>
    setStockRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () =>
    setStockRows((rows) => [...rows, { warehouseId: defaultWh, quantity: 0 }]);
  const removeRow = (idx: number) =>
    setStockRows((rows) => rows.filter((_, i) => i !== idx));

  const submit = () => {
    if (!sku || !name) return toast.error("SKU and name are required");
    const productId = `p-${Date.now()}`;
    const initial = stockRows
      .filter((r) => r.warehouseId && r.quantity > 0)
      .map((r) => ({ warehouseId: r.warehouseId, quantity: r.quantity, unitCost: avgCost }));
    addProduct(
      {
        id: productId,
        companyId: activeCompanyId,
        sku, name, category, unit, price, avgCost, reorderLevel,
      },
      initial,
    );
    toast.success(`Product ${name} added${initial.length ? ` with opening stock` : ""}`);
    setSku(""); setSkuEdited(false); setName(""); setCategory(""); setUnit("pcs");
    setPrice(0); setAvgCost(0); setReorderLevel(0);
    setStockRows([{ warehouseId: defaultWh, quantity: 0 }]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> New product</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => onNameChange(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>SKU</Label><Input value={sku} placeholder="Auto-generated" onChange={(e) => { setSku(e.target.value); setSkuEdited(true); }} /></div>
          <div className="grid gap-1.5"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Avg cost</Label><Input type="number" min={0} step="0.01" value={avgCost || ""} onChange={(e) => setAvgCost(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Price</Label><Input type="number" min={0} step="0.01" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Reorder level</Label><Input type="number" min={0} value={reorderLevel || ""} onChange={(e) => setReorderLevel(Number(e.target.value))} /></div>
        </div>

        <div className="mt-2 border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <Label>Initial stock by warehouse</Label>
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
                  value={row.quantity}
                  onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })}
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
            Opening quantities are valued at the avg cost above.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
