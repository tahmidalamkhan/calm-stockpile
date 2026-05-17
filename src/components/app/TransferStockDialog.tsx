import * as React from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/lib/mock/store";
import { toast } from "sonner";

export function TransferStockDialog() {
  const { activeCompanyId, warehouses, products, stockMovements, transferStock } = useCompany();
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ps = products.filter((p) => p.companyId === activeCompanyId);

  const [open, setOpen] = React.useState(false);
  const [fromId, setFromId] = React.useState<string>(ws[0]?.id ?? "");
  const [toId, setToId] = React.useState<string>(ws[1]?.id ?? ws[0]?.id ?? "");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [picks, setPicks] = React.useState<Record<string, number>>({});
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setPicks({});
      setSearch("");
    }
  }, [open, fromId]);

  const qtyAt = (productId: string, warehouseId: string) =>
    stockMovements
      .filter((m) => m.productId === productId && m.warehouseId === warehouseId)
      .reduce((s, m) => s + m.quantity, 0);

  const inventory = ps
    .map((p) => ({ p, available: qtyAt(p.id, fromId) }))
    .filter((x) => x.available > 0)
    .filter((x) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return x.p.name.toLowerCase().startsWith(q) || x.p.sku.toLowerCase().startsWith(q);
    });

  const toggle = (productId: string, available: number) =>
    setPicks((cur) => {
      const next = { ...cur };
      if (next[productId] != null) delete next[productId];
      else next[productId] = available;
      return next;
    });

  const submit = () => {
    if (!fromId || !toId) return toast.error("Pick source and destination");
    if (fromId === toId) return toast.error("Source and destination must differ");
    const items = Object.entries(picks)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }))
      .filter((it) => it.quantity > 0);
    if (!items.length) return toast.error("Select at least one item with quantity");
    for (const it of items) {
      const avail = qtyAt(it.productId, fromId);
      if (it.quantity > avail) {
        return toast.error(
          `Quantity for ${ps.find((p) => p.id === it.productId)?.name} exceeds available (${avail})`,
        );
      }
    }
    transferStock({
      fromWarehouseId: fromId,
      toWarehouseId: toId,
      date,
      items,
      reference: `TRF-${Date.now().toString().slice(-6)}`,
    });
    toast.success(`Transferred ${items.length} item(s)`);
    setPicks({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowLeftRight className="mr-1 h-4 w-4" /> Transfer stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Transfer stock between warehouses</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label>From</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ws.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>To</Label>
            <Select value={toId} onValueChange={setToId}>
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

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="mt-2 max-h-[360px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right w-32">Transfer qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No stock available in this warehouse.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map(({ p, available }) => {
                  const checked = picks[p.id] != null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(p.id, available)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right font-mono">{available}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={available}
                          disabled={!checked}
                          value={checked ? picks[p.id] : 0}
                          onChange={(e) =>
                            setPicks((cur) => ({ ...cur, [p.id]: Number(e.target.value) }))
                          }
                          className="ml-auto h-8 w-24 text-right"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
