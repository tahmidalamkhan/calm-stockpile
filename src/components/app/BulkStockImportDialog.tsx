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
import type { StockMovement } from "@/lib/types";
import { toast } from "sonner";

type Row = {
  sku: string;
  name: string;
  quantity: number;
  cost: number;
  status: "new" | "existing" | "invalid";
  productId?: string;
  warehouseId?: string;
  warehouseLabel?: string;
  reason?: string;
};

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/[\s_-]+/g, "");

const valueFor = (row: Record<string, unknown>, aliases: string[]) => {
  const normalized = new Map(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );
  for (const alias of aliases) {
    const value = normalized.get(normalizeHeader(alias));
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

export function BulkStockImportDialog({ initialWarehouseId }: { initialWarehouseId?: string }) {
  const { activeCompanyId, warehouses, products, addProduct, addStockMovements } = useCompany();
  // Match against every warehouse/product, regardless of which company record it was saved under.
  const ws = warehouses;
  const ps = products;

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
    // Detect side-by-side warehouse columns (header = warehouse name or code)
    const headers = new Set<string>();
    raw.forEach((r) => Object.keys(r).forEach((k) => headers.add(k)));
    const whCols = [...headers]
      .map((h) => {
        const key = normalizeHeader(h);
        const wh = ws.find((w) => normalizeHeader(w.name) === key || normalizeHeader(w.code) === key);
        return wh ? { header: h, wh } : null;
      })
      .filter((x): x is { header: string; wh: (typeof ws)[number] } => !!x);

    return raw.flatMap((r): Row[] => {
      const sku = String(valueFor(r, ["sku", "sku code", "product sku", "item sku"])).trim();
      const name = String(valueFor(r, ["name", "product name", "item name", "product description"])).trim();
      const cost = Number(valueFor(r, ["cost", "unit cost", "price", "unit price"]) || 0);
      const existing = sku ? ps.find((p) => p.sku.toLowerCase() === sku.toLowerCase()) : undefined;

      const build = (quantity: number, warehouseId?: string, warehouseLabel?: string): Row => {
        const base = { sku, name, quantity, cost, warehouseId, warehouseLabel };
        if (!sku) return { ...base, status: "invalid", reason: "Missing SKU" };
        if (!quantity || quantity <= 0) return { ...base, status: "invalid", reason: "Invalid quantity" };
        if (existing) return { ...base, name: existing.name || name, status: "existing", productId: existing.id };
        if (!name) return { ...base, status: "invalid", reason: "Missing product name" };
        return { ...base, status: "new" };
      };

      if (whCols.length) {
        const out = whCols
          .map(({ header, wh }) => ({ q: Number(r[header] || 0), wh }))
          .filter(({ q }) => q > 0)
          .map(({ q, wh }) => build(q, wh.id, wh.name));
        if (out.length) return out;
        const fallbackQty = Number(valueFor(r, ["quantity", "qty", "stock quantity"]) || 0);
        if (!fallbackQty && !sku && !name) return [];
        return [build(fallbackQty)];
      }

      const quantity = Number(valueFor(r, ["quantity", "qty", "stock quantity"]) || 0);
      const warehouseRaw = String(
        valueFor(r, ["warehouse", "warehouse name", "warehouse code", "destination"]),
      ).trim();
      if (warehouseRaw) {
        const key = normalizeHeader(warehouseRaw);
        const wh = ws.find((w) => normalizeHeader(w.name) === key || normalizeHeader(w.code) === key);
        if (!wh)
          return [{ sku, name, quantity, cost, status: "invalid", reason: `Unknown warehouse "${warehouseRaw}"` }];
        return [build(quantity, wh.id, wh.name)];
      }
      return [build(quantity)];
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
    const names = ws.length ? ws.map((w) => w.name) : ["Main Warehouse"];
    const sample = (sku: string, name: string, cost: number, qtys: number[]) => {
      const row: Record<string, unknown> = { SKU: sku, "Product Name": name, Cost: cost };
      names.forEach((n, i) => (row[n] = qtys[i % qtys.length]));
      return row;
    };
    const ws2 = XLSX.utils.json_to_sheet([
      sample("SKU-001", "Sample Product A", 12.5, [10, 5, 0]),
      sample("SKU-002", "Sample Product B", 30, [0, 20, 8]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws2, "Stock");
    XLSX.writeFile(wb, "stock-import-template.xlsx");
  };

  const submit = async () => {
    if (!warehouseId) return toast.error("Pick a warehouse");
    const valid = rows.filter((r) => r.status !== "invalid");
    if (!valid.length) return toast.error("No valid rows to import");

    const movements: StockMovement[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const ts = Date.now();

    // A new SKU split across several warehouses must be created only once.
    const createdBySku = new Map<string, string>();

    for (let idx = 0; idx < valid.length; idx++) {
      const row = valid[idx];
      let productId = row.productId;
      if (row.status === "new") {
        const skuKey = row.sku.toLowerCase();
        const already = createdBySku.get(skuKey);
        if (already) {
          productId = already;
        } else {
          const created = await addProduct({
            id: "",
            companyId: activeCompanyId,
            sku: row.sku || `BULK-${ts.toString().slice(-5)}-${idx + 1}`,
            name: row.name || row.sku,
            category: "Imported",
            unit: "pcs",
            avgCost: row.cost,
            price: row.cost,
            reorderLevel: 0,
          });
          if (!created) continue;
          productId = created.id;
          createdBySku.set(skuKey, created.id);
        }
      }
      if (!productId) continue;
      movements.push({
        id: "",
        companyId: activeCompanyId,
        date: today,
        productId,
        warehouseId: row.warehouseId ?? warehouseId,
        type: "purchase",
        quantity: row.quantity,
        unitCost: row.cost,
        reference: `BULK-${fileName || "import"}`,
      });
    }

    await addStockMovements(movements);
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
          Columns: <code>SKU</code>, <code>Product Name</code>, <code>Cost</code>, then one column per warehouse
          (headed with the warehouse name or code) holding the quantity for that warehouse — leave blank or 0 to skip.
          Download the template to get your warehouses as columns. Files with a single <code>Quantity</code> column
          still work and go to the warehouse selected above.
          Products are matched by SKU — existing SKUs get a purchase (stock in);
          new SKUs are created as new products.
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
                    <TableHead>SKU</TableHead>
                    <TableHead>Product name</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-normal break-all font-mono text-xs">{r.sku || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="min-w-56 whitespace-normal break-words">
                        {r.name ? (
                          <>
                            <div className="font-medium">{r.name}</div>
                            <div className="break-all font-mono text-xs text-muted-foreground">SKU: {r.sku}</div>
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-xs">
                        {r.warehouseLabel ?? (
                          <span className="text-muted-foreground">
                            {ws.find((w) => w.id === warehouseId)?.name ?? "Selected warehouse"}
                          </span>
                        )}
                      </TableCell>
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
