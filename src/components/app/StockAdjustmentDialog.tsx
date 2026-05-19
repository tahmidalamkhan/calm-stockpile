import * as React from "react";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
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
import { ProductSearchSelect } from "@/components/app/ProductSearchSelect";
import { useCompany } from "@/lib/mock/store";
import type { StockMovement } from "@/lib/types";
import { toast } from "sonner";

type Line = {
  id: string;
  productId: string;
  countedQty: number;
};

const newLine = (): Line => ({
  id: `l-${Math.random().toString(36).slice(2, 9)}`,
  productId: "",
  countedQty: 0,
});

export function StockAdjustmentDialog() {
  const { activeCompanyId, warehouses, products, stockMovements, addStockMovements } = useCompany();
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ps = products.filter((p) => p.companyId === activeCompanyId);

  const [open, setOpen] = React.useState(false);
  const [warehouseId, setWarehouseId] = React.useState<string>(ws[0]?.id ?? "");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = React.useState<Line[]>([newLine()]);

  React.useEffect(() => {
    if (open) {
      setLines([newLine()]);
      setDate(new Date().toISOString().slice(0, 10));
      if (!warehouseId && ws[0]) setWarehouseId(ws[0].id);
    }
  }, [open]);

  const qtyAt = (productId: string, whId: string) =>
    stockMovements
      .filter((m) => m.productId === productId && m.warehouseId === whId)
      .reduce((s, m) => s + m.quantity, 0);

  const update = (id: string, patch: Partial<Line>) =>
    setLines((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) =>
    setLines((cur) => (cur.length > 1 ? cur.filter((l) => l.id !== id) : cur));

  const submit = () => {
    if (!warehouseId) return toast.error("Pick a warehouse");
    const valid = lines.filter((l) => l.productId);
    if (!valid.length) return toast.error("Add at least one line");

    const ref = `ADJ-${Date.now().toString().slice(-6)}`;
    const ts = Date.now();
    const movements: StockMovement[] = [];
    for (let i = 0; i < valid.length; i++) {
      const l = valid[i];
      const current = qtyAt(l.productId, warehouseId);
      const delta = l.countedQty - current;
      if (delta === 0) continue;
      movements.push({
        id: `sm-adj-${ts}-${i}`,
        companyId: activeCompanyId,
        date,
        productId: l.productId,
        warehouseId,
        type: "adjustment",
        quantity: delta,
        unitCost: 0,
        reference: ref,
        fromQty: current,
        toQty: l.countedQty,
      });
    }
    if (!movements.length) return toast.error("No changes to apply");
    addStockMovements(movements);
    toast.success(`Adjusted ${movements.length} line(s)`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ClipboardCheck className="mr-1 h-4 w-4" /> Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stock adjustment — recount by warehouse</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
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
                <TableHead className="text-right">System qty</TableHead>
                <TableHead className="text-right w-28">Counted qty</TableHead>
                <TableHead className="text-right w-24">Difference</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const sys = l.productId && warehouseId ? qtyAt(l.productId, warehouseId) : 0;
                const diff = (l.countedQty || 0) - sys;
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <ProductSearchSelect
                        products={ps}
                        value={l.productId}
                        onChange={(v) => update(l.id, { productId: v })}
                        placeholder="Select product"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">{sys}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0}
                        value={l.countedQty || ""}
                        onChange={(e) => update(l.id, { countedQty: Math.max(0, Number(e.target.value) || 0) })}
                        className="ml-auto h-8 w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className={`text-right font-mono ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>
                      {diff > 0 ? `+${diff}` : diff}
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
          <Button onClick={submit}>Apply adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
