import * as React from "react";
import { PackageMinus, Plus, Trash2, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProductSearchSelect } from "@/components/app/ProductSearchSelect";
import { useCompany } from "@/lib/mock/store";
import { useAuth } from "@/hooks/use-auth";
import type { StockMovement } from "@/lib/types";
import { toast } from "sonner";

type Dest = { id: string; warehouseId: string; quantity: number };
type Item = { id: string; productId: string; sold: number; price: number; dests: Dest[] };

const uid = () => Math.random().toString(36).slice(2, 9);
const newDest = (): Dest => ({ id: uid(), warehouseId: "", quantity: 0 });
const newItem = (): Item => ({ id: uid(), productId: "", sold: 0, price: 0, dests: [] });
const num = (v: string) => Math.max(0, Number(v) || 0);

export function StockOutTransferDialog() {
  const { activeCompanyId, warehouses, products, stockMovements, addStockMovements } = useCompany();
  const { role } = useAuth();
  const isStaff = role === "staff";

  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [fromId, setFromId] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([newItem()]);

  React.useEffect(() => {
    if (open) {
      setItems([newItem()]);
      setDate(new Date().toISOString().slice(0, 10));
      setReference(`DISP-${Date.now().toString().slice(-6)}`);
      setFromId((cur) => cur || (warehouses.find((w) => w.isDefault) ?? warehouses[0])?.id || "");
    }
  }, [open, warehouses]);

  const qtyAt = (productId: string, warehouseId: string) =>
    Math.max(0, stockMovements
      .filter((m) => m.productId === productId && m.warehouseId === warehouseId)
      .reduce((s, m) => s + m.quantity, 0));

  const upd = (id: string, patch: Partial<Item>) =>
    setItems((c) => c.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const updDest = (itemId: string, destId: string, patch: Partial<Dest>) =>
    setItems((c) => c.map((i) => i.id !== itemId ? i : {
      ...i, dests: i.dests.map((d) => (d.id === destId ? { ...d, ...patch } : d)),
    }));

  const totalOf = (i: Item) => i.sold + i.dests.reduce((s, d) => s + d.quantity, 0);

  // Per-product totals across all items so the same product can't be over-dispatched.
  const usedByProduct = new Map<string, number>();
  for (const i of items) if (i.productId) usedByProduct.set(i.productId, (usedByProduct.get(i.productId) ?? 0) + totalOf(i));
  const overLimit = [...usedByProduct].some(([pid, t]) => t > qtyAt(pid, fromId));

  const submit = async () => {
    if (busy) return;
    if (!fromId) return toast.error("Pick a source warehouse");
    const valid = items.filter((i) => i.productId && totalOf(i) > 0);
    if (!valid.length) return toast.error("Add at least one product with a quantity");
    for (const i of valid) {
      for (const d of i.dests) {
        if (d.quantity > 0 && !d.warehouseId) return toast.error("Pick a destination warehouse for every transfer");
        if (d.warehouseId === fromId) return toast.error("Destination must differ from source");
      }
    }
    if (overLimit) return toast.error("Total dispatched exceeds available stock");

    const ref = reference.trim() || `DISP-${Date.now().toString().slice(-6)}`;
    const movements: StockMovement[] = [];
    const base = { id: "", companyId: activeCompanyId, date, reference: ref };
    for (const i of valid) {
      if (i.sold > 0) {
        const p = products.find((x) => x.id === i.productId);
        movements.push({
          ...base, productId: i.productId, warehouseId: fromId, type: "sale",
          quantity: -i.sold, unitCost: isStaff ? (p?.price ?? 0) : i.price,
        });
      }
      for (const d of i.dests) {
        if (d.quantity <= 0) continue;
        movements.push({ ...base, productId: i.productId, warehouseId: fromId, type: "transfer", quantity: -d.quantity, unitCost: 0 });
        movements.push({ ...base, productId: i.productId, warehouseId: d.warehouseId, type: "transfer", quantity: d.quantity, unitCost: 0 });
      }
    }
    setBusy(true);
    try {
      await addStockMovements(movements);
      toast.success(`Dispatched ${valid.length} product(s)`);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PackageMinus className="mr-1 h-4 w-4" /> Stock Out & Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock out & transfer</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>From warehouse</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3">
          {items.map((i) => {
            const avail = i.productId ? qtyAt(i.productId, fromId) : 0;
            const used = i.productId ? usedByProduct.get(i.productId) ?? 0 : 0;
            const total = totalOf(i);
            const over = i.productId && used > avail;
            return (
              <div key={i.id} className="grid gap-3 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <ProductSearchSelect
                      products={products}
                      value={i.productId}
                      onChange={(v) => upd(i.id, { productId: v })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Remove product"
                    onClick={() => setItems((c) => (c.length > 1 ? c.filter((x) => x.id !== i.id) : c))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">Available: <span className="font-mono">{avail}</span></div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Sold / stock out</Label>
                    <Input type="number" min={0} value={i.sold || ""} onChange={(e) => upd(i.id, { sold: num(e.target.value) })} />
                  </div>
                  {!isStaff && (
                    <div className="grid gap-1.5">
                      <Label>Selling price</Label>
                      <Input type="number" min={0} step="0.01" value={i.price || ""} onChange={(e) => upd(i.id, { price: num(e.target.value) })} />
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Transfer to</Label>
                  {i.dests.map((d) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <Select value={d.warehouseId} onValueChange={(v) => updDest(i.id, d.id, { warehouseId: v })}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Destination warehouse" /></SelectTrigger>
                        <SelectContent>
                          {warehouses.filter((w) => w.id !== fromId).map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min={0} className="w-28" placeholder="Qty"
                        value={d.quantity || ""} onChange={(e) => updDest(i.id, d.id, { quantity: num(e.target.value) })} />
                      <Button variant="ghost" size="icon" aria-label="Remove destination"
                        onClick={() => upd(i.id, { dests: i.dests.filter((x) => x.id !== d.id) })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button variant="outline" size="sm" onClick={() => upd(i.id, { dests: [...i.dests, newDest()] })}>
                      <Plus className="mr-1 h-4 w-4" /> Add destination
                    </Button>
                  </div>
                </div>

                <div className={over ? "text-sm font-medium text-destructive" : "text-sm"}>
                  Total dispatched: <span className="font-mono">{total}</span>
                  {over && ` — exceeds available (${avail})`}
                </div>
              </div>
            );
          })}
          <div>
            <Button variant="outline" size="sm" onClick={() => setItems((c) => [...c, newItem()])}>
              <Plus className="mr-1 h-4 w-4" /> Add product
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || overLimit}>{busy ? "Saving…" : "Confirm"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
