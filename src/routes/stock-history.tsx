import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowLeft, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/lib/mock/store";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/stock-history")({
  head: () => ({
    meta: [
      { title: "Stock History — StockHub" },
      { name: "description", content: "Search a product and view its full stock movement history." },
    ],
  }),
  component: StockHistoryPage,
});

function StockHistoryPage() {
  const {
    activeCompanyId,
    products,
    stockMovements,
    warehouses,
    suppliers,
  } = useCompany();

  const partyFor = (m: { type: string; reference: string }) => {
    if (m.type === "purchase") {
      const ref = m.reference;
      const su = suppliers.find((s) => ref.includes(s.name));
      return su?.name ?? "—";
    }
    if (m.type === "transfer") return "Internal transfer";
    if (m.type === "sale") return "Sale";
    return "—";
  };
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");

  const companyProducts = React.useMemo(
    () => products.filter((p) => p.companyId === activeCompanyId),
    [products, activeCompanyId],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companyProducts;
    return companyProducts.filter(
      (p) => p.name.toLowerCase().startsWith(q) || p.sku.toLowerCase().startsWith(q),
    );
  }, [companyProducts, query]);

  const selectedProduct = selectedId
    ? companyProducts.find((p) => p.id === selectedId)
    : null;

  const allMovements = React.useMemo(() => {
    if (!selectedProduct) return [];
    return stockMovements
      .filter((m) => m.productId === selectedProduct.id)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [stockMovements, selectedProduct]);

  const warehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? "—";

  const perWarehouse = React.useMemo(() => {
    const map = new Map<
      string,
      { warehouseId: string; inQty: number; outQty: number; movements: number }
    >();
    for (const m of allMovements) {
      const entry =
        map.get(m.warehouseId) ?? {
          warehouseId: m.warehouseId,
          inQty: 0,
          outQty: 0,
          movements: 0,
        };
      if (m.quantity > 0) entry.inQty += m.quantity;
      else entry.outQty += m.quantity;
      entry.movements += 1;
      map.set(m.warehouseId, entry);
    }
    return Array.from(map.values()).sort((a, b) =>
      warehouseName(a.warehouseId).localeCompare(warehouseName(b.warehouseId)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMovements, warehouses]);

  const movements = React.useMemo(() => {
    if (warehouseFilter === "all") return allMovements;
    return allMovements.filter((m) => m.warehouseId === warehouseFilter);
  }, [allMovements, warehouseFilter]);

  const totalIn = movements.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
  const totalOut = movements.filter((m) => m.quantity < 0).reduce((s, m) => s + m.quantity, 0);
  const onHand = totalIn + totalOut;

  const typeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    purchase: "default",
    sale: "destructive",
    transfer: "secondary",
    adjustment: "outline",
  };

  if (selectedProduct) {
    return (
      <>
        <PageHeader
          title={selectedProduct.name}
          description={`SKU ${selectedProduct.sku} • ${selectedProduct.category}`}
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setSelectedId(null);
                setWarehouseFilter("all");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to products
            </Button>
          }
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">On hand</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatNumber(onHand)} {selectedProduct.unit}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total in</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-primary">+{formatNumber(totalIn)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-destructive">{formatNumber(totalOut)}</div>
            </CardContent>
          </Card>
        </div>

        {perWarehouse.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Warehouse className="h-4 w-4" />
                Stock by warehouse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Movements</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perWarehouse.map((w) => {
                    const onHandW = w.inQty + w.outQty;
                    const isActive = warehouseFilter === w.warehouseId;
                    return (
                      <TableRow key={w.warehouseId}>
                        <TableCell className="font-medium">
                          {warehouseName(w.warehouseId)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary">
                          +{formatNumber(w.inQty)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {formatNumber(w.outQty)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(onHandW)} {selectedProduct.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {w.movements}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            onClick={() =>
                              setWarehouseFilter(isActive ? "all" : w.warehouseId)
                            }
                          >
                            {isActive ? "Showing" : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>
              Movement history
              {warehouseFilter !== "all" && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {warehouseName(warehouseFilter)}
                </span>
              )}
            </CardTitle>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {perWarehouse.map((w) => (
                  <SelectItem key={w.warehouseId} value={w.warehouseId}>
                    {warehouseName(w.warehouseId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No movements recorded for this product.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.date)}</TableCell>
                        <TableCell>
                          <Badge variant={typeVariant[m.type] ?? "outline"} className="capitalize">
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                        <TableCell>{partyFor(m)}</TableCell>
                        <TableCell>{warehouseName(m.warehouseId)}</TableCell>
                        <TableCell
                          className={`text-right font-mono ${m.quantity > 0 ? "text-primary" : "text-destructive"}`}
                        >
                          {m.quantity > 0 ? "+" : ""}
                          {formatNumber(m.quantity)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {m.unitCost ? formatCurrency(m.unitCost) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {m.unitCost ? formatCurrency(m.unitCost * Math.abs(m.quantity)) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-semibold bg-muted/40">
                      <TableCell colSpan={7} className="text-right">Total buying value</TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        {formatCurrency(
                          movements
                            .filter((m) => m.type === "purchase")
                            .reduce((s, m) => s + (m.unitCost || 0) * Math.abs(m.quantity), 0),
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-semibold bg-muted/40">
                      <TableCell colSpan={7} className="text-right">Total selling value</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {formatCurrency(
                          movements
                            .filter((m) => m.type === "sale")
                            .reduce((s, m) => s + (m.unitCost || 0) * Math.abs(m.quantity), 0),
                        )}
                      </TableCell>
                    </TableRow>

                  </>
                )}
              </TableBody>

            </Table>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Stock History"
        description="Search a product to see all of its purchases, sales, transfers and adjustments."
      />

      <Card>
        <CardHeader>
          <CardTitle>Find a product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Movements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No products match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const ms = stockMovements.filter((m) => m.productId === p.id);
                  const qty = ms.reduce((s, m) => s + m.quantity, 0);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(p.id)}
                    >
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(qty)} {p.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono">{ms.length}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
