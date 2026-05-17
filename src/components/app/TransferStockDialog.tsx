import * as React from "react";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/lib/mock/store";
import { toast } from "sonner";

type Line = { id: string; productId: string; toWarehouseId: string; quantity: number };

const newLine = (): Line => ({
  id: `l-${Math.random().toString(36).slice(2, 9)}`,
  productId: "",
  toWarehouseId: "",
  quantity: 0,
});

export function TransferStockDialog() {
  const { activeCompanyId, warehouses, products, stockMovements, transferStock } = useCompany();
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ps = products.filter((p) => p.companyId === activeCompanyId);

  const [open, setOpen] = React.useState(false);
  const [fromId, setFromId] = React.useState<string>(ws[0]?.id ?? "");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = React.useState<Line[]>([newLine()]);

  React.useEffect(() => {
    if (open) {
      setLines([newLine()]);
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const qtyAt = (productId: string, warehouseId: string) =>
    stockMovements
      .filter((m) => m.productId === productId && m.warehouseId === warehouseId)
      .reduce((s, m) => s + m.quantity, 0);

  const update = (id: string, patch: Partial<Line>) =>
    setLines((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) =>
    setLines((cur) => (cur.length > 1 ? cur.filter((l) => l.id !== id) : cur));

  const submit = () => {
    if (!fromId) return toast.error("Pick a source warehouse");
    const valid = lines.filter((l) => l.productId && l.toWarehouseId && l.quantity > 0);
    if (!valid.length) return toast.error("Add at least one line");
    for (const l of valid) {
      if (l.toWarehouseId === fromId)
        return toast.error("Destination must differ from source");
    }
    // Validate against availability per product
    const byProduct = new Map<string, number>();
    for (const l of valid) byProduct.set(l.productId, (byProduct.get(l.productId) ?? 0) + l.quantity);
    for (const [pid, total] of byProduct) {
      const avail = qtyAt(pid, fromId);
      if (total > avail) {
        const name = ps.find((p) => p.id === pid)?.name ?? pid;
        return toast.error(`Total transfer of ${name} (${total}) exceeds available (${avail})`);
      }
    }
    // Group by destination so we send one transfer per destination
    const byDest = new Map<string, { productId: string; quantity: number }[]>();
    for (const l of valid) {
      const arr = byDest.get(l.toWarehouseId) ?? [];
      arr.push({ productId: l.productId, quantity: l.quantity });
      byDest.set(l.toWarehouseId, arr);
    }
    const ref = `TRF-${Date.now().toString().slice(-6)}`;
    for (const [toId, items] of byDest) {
      transferStock({ fromWarehouseId: fromId, toWarehouseId: toId, date, items, reference: ref });
    }
    toast.success(`Transferred ${valid.length} line(s) to ${byDest.size} warehouse(s)`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowLeftRight className="mr-1 h-4 w-4" /> Transfer stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Transfer stock to one or more warehouses</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>From warehouse</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ws.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-2 max-h-[420px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>To warehouse</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right w-28">Quantity</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const avail = l.productId ? qtyAt(l.productId, fromId) : 0;
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Select value={l.productId} onValueChange={(v) => update(l.id, { productId: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {ps.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={l.toWarehouseId} onValueChange={(v) => update(l.id, { toWarehouseId: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                        <SelectContent>
                          {ws.filter((w) => w.id !== fromId).map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right font-mono">{avail}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} max={avail}
                        value={l.quantity || ""}
                        onChange={(e) => update(l.id, { quantity: Number(e.target.value) })}
                        className="ml-auto h-8 w-24 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div>
          <Button variant="outline" size="sm" onClick={() => setLines((c) => [...c, newLine()])}>
            <Plus className="mr-1 h-4 w-4" /> Add line
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
