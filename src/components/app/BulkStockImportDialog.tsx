import * as React from "react";
import { Upload, Download } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/lib/mock/store";
import type { Product, StockMovement } from "@/lib/types";
import { toast } from "sonner";

type Row = {
  sku: string;
  name: string;
  quantity: number;
  cost: number;
  status: "new" | "existing" | "invalid";
  productId?: string;
  reason?: string;
};

export function BulkStockImportDialog({ initialWarehouseId }: { initialWarehouseId?: string }) {
  const { activeCompanyId, warehouses, products, addProduct, addStockMovements } = useCompany();
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ps = products.filter((p) => p.companyId === activeCompanyId);

  const [open, setOpen] = React.useState(false);
  const [warehouseId, setWarehouseId] = React.useState<string>(
    initialWarehouseId ?? ws.find((w) => w.isDefault)?.id ?? ws[0]?.id ?? "",
  );
  const [rows, setRows] = React.useState<Row[]>([]);
  const [fileName, setFileName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialWarehouseId) setWarehouseId(initialWarehouseId);
  }, [initialWarehouseId]);

  const parseRows = (raw: Record<string, unknown>[]): Row[] => {
    return raw.map((r) => {
      const sku = String(r.sku ?? r.SKU ?? r.Sku ?? "").trim();
      const name = String(r.name ?? r.Name ?? r.NAME ?? "").trim();
      const quantity = Number(r.quantity ?? r.Quantity ?? r.QUANTITY ?? r.qty ?? 0);
      const cost = Number(r.cost ?? r.Cost ?? r.COST ?? r.price ?? 0);
      if (!sku) return { sku, name, quantity, cost, status: "invalid", reason: "Missing SKU" };
      if (!quantity || quantity <= 0)
        return { sku, name, quantity, cost, status: "invalid", reason: "Invalid quantity" };
      const existing = ps.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
      return existing
        ? { sku, name: name || existing.name, quantity, cost, status: "existing", productId: existing.id }
        : { sku, name, quantity, cost, status: "new" };
    });
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    setRows(parseRows(json));
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws2 = XLSX.utils.json_to_sheet([
      { name: "Sample Product A", quantity: 10, cost: 12.5 },
      { name: "Sample Product B", quantity: 5, cost: 30 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws2, "Stock");
    XLSX.writeFile(wb, "stock-import-template.xlsx");
  };

  const submit = () => {
    if (!warehouseId) return toast.error("Pick a warehouse");
    const valid = rows.filter((r) => r.status !== "invalid");
    if (!valid.length) return toast.error("No valid rows to import");

    const movements: StockMovement[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const ts = Date.now();

    valid.forEach((row, idx) => {
      let productId = row.productId;
      if (row.status === "new") {
        productId = `p-${ts}-${idx}`;
        const newProduct: Product = {
          id: productId,
          companyId: activeCompanyId,
          sku: `BULK-${ts.toString().slice(-5)}-${idx + 1}`,
          name: row.name,
          category: "Imported",
          unit: "pcs",
          avgCost: row.cost,
          price: row.cost,
          reorderLevel: 0,
        };
        addProduct(newProduct);
      }
      movements.push({
        id: `sm-bulk-${ts}-${idx}`,
        companyId: activeCompanyId,
        date: today,
        productId: productId!,
        warehouseId,
        type: "adjustment",
        quantity: row.quantity,
        unitCost: row.cost,
        reference: `BULK-${fileName || "import"}`,
      });
    });

    addStockMovements(movements);
    toast.success(`Imported ${valid.length} row(s)`);
    setRows([]);
    setFileName("");
    setOpen(false);
  };

  const summary = {
    new: rows.filter((r) => r.status === "new").length,
    existing: rows.filter((r) => r.status === "existing").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-1 h-4 w-4" /> Bulk import (Excel)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Bulk import stock from Excel</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Destination warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ws.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Excel file</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                Choose file
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="mr-1 h-3 w-3" /> Template
              </Button>
            </div>
            {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Required columns: <code>name</code>, <code>quantity</code>, <code>cost</code>.
          Existing products (matched by name) get a stock adjustment; new products are created.
        </p>

        {rows.length > 0 && (
          <>
            <div className="flex gap-3 text-sm">
              <span className="rounded-md bg-secondary px-2 py-1">New: {summary.new}</span>
              <span className="rounded-md bg-secondary px-2 py-1">Existing: {summary.existing}</span>
              {summary.invalid > 0 && (
                <span className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
                  Invalid: {summary.invalid}
                </span>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right font-mono">{r.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{r.cost}</TableCell>
                      <TableCell>
                        {r.status === "invalid" ? (
                          <span className="text-xs text-destructive">{r.reason}</span>
                        ) : r.status === "new" ? (
                          <span className="text-xs">New product</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Update existing</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={rows.length === 0}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
