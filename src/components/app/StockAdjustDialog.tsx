import * as React from "react";
import { ArrowDownToLine, ArrowUpFromLine, Plus, Trash2 } from "lucide-react";
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

type Direction = "in" | "out";
type Line = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
};

const newLine = (): Line => ({
  id: `l-${Math.random().toString(36).slice(2, 9)}`,
  productId: "",
  warehouseId: "",
  quantity: 0,
  unitCost: 0,
});

export function StockAdjustDialog({ direction }: { direction: Direction }) {
  const isIn = direction === "in";
  const { activeCompanyId, warehouses, products, stockMovements, addStockMovements } = useCompany();
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ps = products.filter((p) => p.companyId === activeCompanyId);

  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = React.useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      setLines([newLine()]);
      setDate(new Date().toISOString().slice(0, 10));
      setSubmitting(false);
      submittingRef.current = false;
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

  const submit = async () => {
    if (submittingRef.current) return;
    const valid = lines.filter((l) => l.productId && l.warehouseId && l.quantity > 0);
    if (!valid.length) return toast.error("Add at least one line");
    if (!isIn) {
      for (const l of valid) {
        const avail = qtyAt(l.productId, l.warehouseId);
        if (l.quantity > avail) {
          const name = ps.find((p) => p.id === l.productId)?.name ?? l.productId;
          const wh = ws.find((w) => w.id === l.warehouseId)?.name ?? l.warehouseId;
          return toast.error(`${name} in ${wh}: quantity ${l.quantity} exceeds available ${avail}`);
        }
      }
    }
    submittingRef.current = true;
    setSubmitting(true);
    const ref = `${isIn ? "IN" : "OUT"}-${Date.now().toString().slice(-6)}`;
    const ts = Date.now();
    const movements: StockMovement[] = valid.map((l, idx) => ({
      id: `sm-${isIn ? "in" : "out"}-${ts}-${idx}`,
      companyId: activeCompanyId,
      date,
      productId: l.productId,
      warehouseId: l.warehouseId,
      type: isIn ? "purchase" : "sale",
      quantity: isIn ? l.quantity : -l.quantity,
      unitCost: l.unitCost,
      reference: ref,
    }));
    try {
      await addStockMovements(movements);
      toast.success(`Stock ${isIn ? "in" : "out"}: ${valid.length} line(s)`);
      setOpen(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isIn ? "default" : "outline"}>
          {isIn ? <ArrowDownToLine className="mr-1 h-4 w-4" /> : <ArrowUpFromLine className="mr-1 h-4 w-4" />}
          Stock {isIn ? "in" : "out"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isIn ? "Stock in" : "Stock out"} — multiple items & warehouses</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
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
                <TableHead>Warehouse</TableHead>
                {!isIn && <TableHead className="text-right">Available</TableHead>}
                <TableHead className="text-right w-28">Quantity</TableHead>
                <TableHead className="text-right w-28">{isIn ? "Unit cost" : "Unit price"}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const avail = l.productId && l.warehouseId ? qtyAt(l.productId, l.warehouseId) : 0;
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
                    <TableCell>
                      <Select value={l.warehouseId} onValueChange={(v) => update(l.id, { warehouseId: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                        <SelectContent>
                          {ws.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {!isIn && <TableCell className="text-right font-mono">{avail}</TableCell>}
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} max={isIn ? undefined : avail}
                        value={l.quantity || ""}
                        onChange={(e) => update(l.id, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                        className="ml-auto h-8 w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step="0.01"
                        value={l.unitCost || ""}
                        onChange={(e) => update(l.id, { unitCost: Number(e.target.value) })}
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
          <Button onClick={submit}>{isIn ? "Stock in" : "Stock out"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
